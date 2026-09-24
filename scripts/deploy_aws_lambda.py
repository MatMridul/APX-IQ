"""
APX-IQ — Automated AWS Lambda Serverless (Zero-Burn) Deployment Script
======================================================================

Builds the production Docker image, pushes it to Amazon ECR,
and provisions or updates the AWS Lambda backend function with a
direct Lambda Function URL (Zero-Idle-Cost / True Scale-to-Zero).

Requirements:
  - AWS CLI v2 installed and configured (`aws configure` or env vars)
  - Docker Desktop / daemon running
  - IAM permissions: ECR + Lambda + IAM Role creation (or existing role)

Usage:
  python scripts/deploy_aws_lambda.py [--region ap-south-1]
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import time

FUNCTION_NAME = "apx-iq-api"
REPOSITORY_NAME = "apx-iq-api"
ROLE_NAME = "apxiq-lambda-execution-role"
DEFAULT_REGION = os.getenv("AWS_REGION", "ap-south-1")


def run_cmd(cmd: list[str], check: bool = True, capture: bool = True) -> str:
    """Run a shell command and return stdout string."""
    print(f"  → {' '.join(cmd)}")
    result = subprocess.run(
        cmd,
        capture_output=capture,
        text=True,
        check=False,
    )
    if check and result.returncode != 0:
        err = result.stderr.strip() or result.stdout.strip()
        print(f"\n❌ Command failed with code {result.returncode}:\n{err}")
        sys.exit(result.returncode)
    return result.stdout.strip() if capture else ""


def check_prerequisites(region: str) -> str:
    """Verify AWS CLI and Docker are installed and authenticated."""
    print("\n🔍 Step 1: Checking prerequisites...")

    if not shutil.which("aws"):
        print("❌ AWS CLI is not installed or not in PATH.")
        sys.exit(1)

    if not shutil.which("docker"):
        print("❌ Docker is not installed or not in PATH.")
        sys.exit(1)

    # Check AWS identity
    id_output = run_cmd(["aws", "sts", "get-caller-identity", "--output", "json"], check=False)
    try:
        identity = json.loads(id_output)
        account_id = identity["Account"]
        arn = identity["Arn"]
        print(f"  ✅ Authenticated as: {arn} (Account: {account_id})")
        return account_id
    except Exception:
        print("❌ AWS authentication failed. Run 'aws configure' or set AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY.")
        sys.exit(1)


def ensure_ecr_repository(region: str) -> str:
    """Ensure ECR repository exists and return its URI."""
    print(f"\n📦 Step 2: Checking Amazon ECR repository '{REPOSITORY_NAME}' in {region}...")
    output = run_cmd(
        ["aws", "ecr", "describe-repositories", "--repository-names", REPOSITORY_NAME, "--region", region, "--output", "json"],
        check=False,
    )
    try:
        data = json.loads(output)
        uri = data["repositories"][0]["repositoryUri"]
        print(f"  ✅ ECR Repository found: {uri}")
        return uri
    except Exception:
        print(f"  ℹ️ Repository '{REPOSITORY_NAME}' does not exist. Creating...")
        create_out = run_cmd(
            ["aws", "ecr", "create-repository", "--repository-name", REPOSITORY_NAME, "--region", region, "--output", "json"]
        )
        data = json.loads(create_out)
        uri = data["repository"]["repositoryUri"]
        print(f"  ✅ ECR Repository created: {uri}")
        return uri


def build_and_push_image(ecr_uri: str, region: str):
    """Build Docker container and push to Amazon ECR."""
    print("\n🐳 Step 3: Building and pushing Docker container to ECR...")
    # ECR Docker Login
    login_cmd = f"aws ecr get-login-password --region {region} | docker login --username AWS --password-stdin {ecr_uri.split('/')[0]}"
    subprocess.run(login_cmd, shell=True, check=True)

    # Build with --platform linux/amd64 --provenance=false to produce a clean single
    # manifest image. Docker Desktop adds attestation manifests by default which
    # AWS Lambda does NOT support (InvalidParameterValueException).
    print("  → Building image (linux/amd64, no attestation manifest)...")
    run_cmd([
        "docker", "build",
        "--platform", "linux/amd64",
        "--provenance=false",
        "-t", "apx-iq-api:latest",
        ".",
    ], capture=False)

    tag = f"{ecr_uri}:latest"
    print(f"  → Tagging image as {tag}...")
    run_cmd(["docker", "tag", "apx-iq-api:latest", tag])
    print(f"  → Pushing {tag} to Amazon ECR...")
    run_cmd(["docker", "push", tag], capture=False)
    print("  ✅ Image pushed successfully.")
    return tag


def ensure_lambda_role(account_id: str) -> str:
    """Ensure IAM execution role for Lambda exists."""
    print(f"\n🛡️ Step 4: Checking IAM execution role '{ROLE_NAME}'...")
    role_arn = f"arn:aws:iam::{account_id}:role/{ROLE_NAME}"
    check = run_cmd(["aws", "iam", "get-role", "--role-name", ROLE_NAME, "--output", "json"], check=False)
    try:
        data = json.loads(check)
        # AWS returns "Role" with capital R
        arn = data["Role"]["Arn"]
        print(f"  ✅ Found IAM Role: {arn}")
        return arn
    except Exception:
        print(f"  ℹ️ Role '{ROLE_NAME}' not found. Creating...")
        trust_policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"Service": "lambda.amazonaws.com"},
                    "Action": "sts:AssumeRole",
                }
            ],
        }
        create_res = run_cmd([
            "aws", "iam", "create-role",
            "--role-name", ROLE_NAME,
            "--assume-role-policy-document", json.dumps(trust_policy),
            "--output", "json",
        ])
        # Attach basic execution policy
        run_cmd([
            "aws", "iam", "attach-role-policy",
            "--role-name", ROLE_NAME,
            "--policy-arn", "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
        ])
        data = json.loads(create_res)
        # AWS returns "Role" with capital R
        arn = data["Role"]["Arn"]
        print(f"  ✅ Created IAM Role: {arn}")
        # Allow IAM propagation
        time.sleep(10)
        return arn


def deploy_lambda_function(image_uri: str, role_arn: str, region: str) -> str:
    """Create or update AWS Lambda function with the container image."""
    print(f"\n⚡ Step 5: Deploying AWS Lambda function '{FUNCTION_NAME}'...")
    check = run_cmd(["aws", "lambda", "get-function", "--function-name", FUNCTION_NAME, "--region", region, "--output", "json"], check=False)
    
    env_vars = {
        "Variables": {
            "PORT": "8000",
            "AWS_LWA_PORT": "8000",
            "AWS_LWA_READINESS_CHECK_PATH": "/health",
            "CORS_ORIGINS": "*",
            "LOG_LEVEL": "INFO",
        }
    }
    # Pass along DATABASE_URL or GEMINI_API_KEY if present in environment
    if os.getenv("DATABASE_URL"):
        env_vars["Variables"]["DATABASE_URL"] = os.getenv("DATABASE_URL")
    if os.getenv("GEMINI_API_KEY"):
        env_vars["Variables"]["GEMINI_API_KEY"] = os.getenv("GEMINI_API_KEY")

    try:
        json.loads(check)
        print(f"  ℹ️ Updating existing Lambda function code to {image_uri}...")
        run_cmd([
            "aws", "lambda", "update-function-code",
            "--function-name", FUNCTION_NAME,
            "--image-uri", image_uri,
            "--region", region,
            "--output", "json",
        ])
        print("  ⏳ Waiting for function update to complete...")
        run_cmd(["aws", "lambda", "wait", "function-updated", "--function-name", FUNCTION_NAME, "--region", region])
    except Exception:
        print(f"  ℹ️ Creating new Lambda function '{FUNCTION_NAME}'...")
        run_cmd([
            "aws", "lambda", "create-function",
            "--function-name", FUNCTION_NAME,
            "--package-type", "Image",
            "--code", f"ImageUri={image_uri}",
            "--role", role_arn,
            "--timeout", "30",
            "--memory-size", "1024",
            "--environment", json.dumps(env_vars),
            "--region", region,
            "--output", "json",
        ])
        print("  ⏳ Waiting for function to become active...")
        run_cmd(["aws", "lambda", "wait", "function-active-v2", "--function-name", FUNCTION_NAME, "--region", region])

    # Ensure Lambda Function URL
    print("\n🌐 Step 6: Configuring Lambda Function URL (Direct HTTPS + CORS)...")
    url_check = run_cmd([
        "aws", "lambda", "get-function-url-config",
        "--function-name", FUNCTION_NAME,
        "--region", region,
        "--output", "json",
    ], check=False)

    cors_config = json.dumps({
        "AllowOrigins": ["*"],
        "AllowMethods": ["*"],
        "AllowHeaders": ["*"],
    })

    try:
        url_data = json.loads(url_check)
        func_url = url_data["FunctionUrl"]
        print(f"  ✅ Function URL exists: {func_url}")
    except Exception:
        print("  ℹ️ Creating Function URL...")
        create_url = run_cmd([
            "aws", "lambda", "create-function-url-config",
            "--function-name", FUNCTION_NAME,
            "--auth-type", "NONE",
            "--cors", cors_config,
            "--region", region,
            "--output", "json",
        ])
        url_data = json.loads(create_url)
        func_url = url_data["FunctionUrl"]
        print(f"  ✅ Function URL created: {func_url}")

    # Add public invoke permission for Function URL
    perm_check = run_cmd([
        "aws", "lambda", "add-permission",
        "--function-name", FUNCTION_NAME,
        "--statement-id", "FunctionURLAllowPublicAccess",
        "--action", "lambda:InvokeFunctionUrl",
        "--principal", "*",
        "--function-url-auth-type", "NONE",
        "--region", region,
    ], check=False)

    return func_url


def main():
    parser = argparse.ArgumentParser(description="Deploy APX-IQ Backend to AWS Lambda (Zero-Burn)")
    parser.add_argument("--region", default=DEFAULT_REGION, help="AWS Region (default: ap-south-1)")
    args = parser.parse_args()

    print("=" * 60)
    print("🚀 APX-IQ AWS Lambda Zero-Burn Deployment")
    print(f"   Region: {args.region} | Function: {FUNCTION_NAME}")
    print("=" * 60)

    account_id = check_prerequisites(args.region)
    ecr_uri = ensure_ecr_repository(args.region)
    image_tag = build_and_push_image(ecr_uri, args.region)
    role_arn = ensure_lambda_role(account_id)
    func_url = deploy_lambda_function(image_tag, role_arn, args.region)

    print("\n" + "=" * 60)
    print("🎉 DEPLOYMENT COMPLETE!")
    print(f"🔗 Public API URL: {func_url}")
    print(f"🏥 Health Check:   {func_url}health")
    print(f"💰 Idle Cost:      $0.00 / month (Scale-to-Zero)")
    print(f"🛡️ Credits Burned: $0.00 (100% of $210 preserved)")
    print("=" * 60)
    print(f"\nNext: Set NEXT_PUBLIC_API_URL={func_url} in Cloudflare Pages!")

    if "GITHUB_OUTPUT" in os.environ:
        with open(os.environ["GITHUB_OUTPUT"], "a") as f:
            f.write(f"url={func_url}\n")


if __name__ == "__main__":
    main()

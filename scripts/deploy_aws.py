"""
APX-IQ — Automated AWS App Runner Deployment Script
===================================================

Builds the production Docker image, pushes it to Amazon ECR,
and provisions or updates the AWS App Runner backend service.

Requirements:
  - AWS CLI v2 installed and configured (`aws configure` or env vars)
  - Docker Desktop / daemon running
  - IAM permissions: ECR + App Runner

Usage:
  python scripts/deploy_aws.py [--region ap-south-1]
"""

import argparse
import json
import os
import shutil
import subprocess
import sys

SERVICE_NAME = "apx-iq-api"
REPOSITORY_NAME = "apx-iq-api"
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
    
    # Try to describe repository
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


def build_and_push_image(ecr_uri: str, region: str, account_id: str):
    """Build Docker container and push to Amazon ECR."""
    print("\n🐳 Step 3: Building and pushing Docker container to ECR...")

    # Log in to ECR
    registry = f"{account_id}.dkr.ecr.{region}.amazonaws.com"
    print(f"  → Logging in to ECR registry: {registry}...")
    login_pw = run_cmd(["aws", "ecr", "get-login-password", "--region", region])
    
    login_proc = subprocess.Popen(
        ["docker", "login", "--username", "AWS", "--password-stdin", registry],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    stdout, stderr = login_proc.communicate(input=login_pw)
    if login_proc.returncode != 0:
        print(f"❌ Docker login to ECR failed: {stderr}")
        sys.exit(1)
    print("  ✅ Docker login succeeded.")

    # Build container
    tag_latest = f"{ecr_uri}:latest"
    print(f"  → Building Docker image: {tag_latest}...")
    run_cmd(["docker", "build", "-t", tag_latest, "."], capture=False)

    # Push container
    print("  → Pushing Docker image to ECR...")
    run_cmd(["docker", "push", tag_latest], capture=False)
    print("  ✅ Image pushed successfully.")


def deploy_app_runner(ecr_uri: str, region: str) -> str:
    """Deploy or update AWS App Runner service."""
    print(f"\n🚀 Step 4: Configuring AWS App Runner service in {region}...")

    # Check if App Runner service exists
    services_out = run_cmd(["aws", "apprunner", "list-services", "--region", region, "--output", "json"])
    services_data = json.loads(services_out)
    service_arn = None
    service_url = None

    for item in services_data.get("ServiceSummaryList", []):
        if item.get("ServiceName") == SERVICE_NAME:
            service_arn = item.get("ServiceArn")
            service_url = item.get("ServiceUrl")
            break

    image_tag = f"{ecr_uri}:latest"

    if service_arn:
        print(f"  ℹ️ Existing App Runner service found: {service_arn}")
        print("  → Triggering new deployment...")
        run_cmd(["aws", "apprunner", "start-deployment", "--service-arn", service_arn, "--region", region])
        print("  ✅ Deployment initiated.")
    else:
        print(f"  ℹ️ Service '{SERVICE_NAME}' not found. Creating new App Runner service...")
        source_config = {
            "ImageRepository": {
                "ImageIdentifier": image_tag,
                "ImageConfiguration": {
                    "Port": "8000",
                    "RuntimeEnvironmentVariables": {
                        "LOG_FORMAT": "json",
                        "CORS_ORIGINS": "*",
                    }
                },
                "ImageRepositoryType": "ECR"
            },
            "AutoDeploymentsEnabled": True
        }
        health_config = {
            "Protocol": "HTTP",
            "Path": "/health",
            "Interval": 10,
            "Timeout": 5,
            "HealthyThreshold": 1,
            "UnhealthyThreshold": 3
        }
        instance_config = {
            "Cpu": "1 vCPU",
            "Memory": "2 GB"
        }

        create_cmd = [
            "aws", "apprunner", "create-service",
            "--service-name", SERVICE_NAME,
            "--source-configuration", json.dumps(source_config),
            "--health-check-configuration", json.dumps(health_config),
            "--instance-configuration", json.dumps(instance_config),
            "--region", region,
            "--output", "json"
        ]
        res = json.loads(run_cmd(create_cmd))
        service_arn = res["Service"]["ServiceArn"]
        service_url = res["Service"]["ServiceUrl"]
        print(f"  ✅ Service created: {service_arn}")

    full_url = f"https://{service_url}" if service_url and not service_url.startswith("http") else service_url
    return full_url


def main():
    parser = argparse.ArgumentParser(description="Deploy APX-IQ Backend to AWS App Runner")
    parser.add_argument("--region", default=DEFAULT_REGION, help="AWS Region (default: ap-south-1)")
    args = parser.parse_args()

    print("=" * 60)
    print("🏎️  APX-IQ — AWS APP RUNNER DEPLOYMENT")
    print(f"    Region: {args.region}")
    print("=" * 60)

    account_id = check_prerequisites(args.region)
    ecr_uri = ensure_ecr_repository(args.region)
    build_and_push_image(ecr_uri, args.region, account_id)
    service_url = deploy_app_runner(ecr_uri, args.region)

    print("\n" + "=" * 60)
    print("🎉 DEPLOYMENT LAUNCHED SUCCESSFULLY!")
    print(f"   Service URL: {service_url}")
    print(f"   Health Check: {service_url}/health")
    print("=" * 60)

    # Set GitHub Actions output if running in CI
    gh_output = os.getenv("GITHUB_OUTPUT")
    if gh_output:
        try:
            with open(gh_output, "a", encoding="utf-8") as f:
                f.write(f"url={service_url}\n")
            print(f"  ✅ Exported url to GITHUB_OUTPUT: {service_url}")
        except Exception as e:
            print(f"  ⚠️ Could not write to GITHUB_OUTPUT: {e}")


if __name__ == "__main__":
    main()

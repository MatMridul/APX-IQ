"""
APX IQ — Graphify Knowledge Graph Generator
============================================

Extracts the codebase AST dependency graph, calculates architectural hubs (god nodes),
and generates interactive D3 tree and Mermaid callflow HTML visualizers.

Usage:
    python scripts/generate_graph.py
"""

import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent

def run_cmd(cmd: list[str]) -> None:
    print(f"\n[Running] {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=str(ROOT_DIR), capture_output=False)
    if result.returncode != 0:
        print(f"[Warning] Command exited with code {result.returncode}")

def main():
    print("=== Generating APX-IQ Codebase Knowledge Graph ===")
    
    # 1. Headless extraction of AST
    run_cmd(["graphify", "extract", ".", "--code-only"])
    
    # 2. Generate Collapsible Tree HTML
    run_cmd(["graphify", "tree"])
    
    # 3. Generate Mermaid Call-Flow HTML
    run_cmd(["graphify", "export", "callflow-html"])
    
    # 4. Display Architectural Hubs
    run_cmd(["graphify", "god-nodes"])
    
    print("\n[Done] Knowledge graph and visualizers generated in graphify-out/")
    print(f"Tree HTML:     file://{ROOT_DIR / 'graphify-out' / 'GRAPH_TREE.html'}")
    print(f"Callflow HTML: file://{ROOT_DIR / 'graphify-out' / 'apx-iq-platform-callflow.html'}")

if __name__ == "__main__":
    main()

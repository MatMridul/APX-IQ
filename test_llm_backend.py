"""Quick LLM backend auto-detection test."""
import httpx

print("=== LLM Backend Auto-Detection Test ===")
print()

# Test 1: Check if Ollama is reachable
try:
    resp = httpx.get("http://localhost:11434/api/tags", timeout=2.0)
    if resp.status_code == 200:
        models = resp.json().get("models", [])
        print("[Ollama] RUNNING")
        for m in models:
            name = m["name"]
            size = m.get("size", 0) / 1e9
            print(f"  Model: {name} ({size:.1f} GB)")
    else:
        print(f"[Ollama] HTTP {resp.status_code}")
except Exception as e:
    print(f"[Ollama] NOT RUNNING ({e})")

print()

# Test 2: Auto-detect backend
from intelligence.report_generator import ReportGenerator

gen = ReportGenerator()
print(f"[Auto-Detect] Active backend: {gen.active_backend}")
print(f"[Auto-Detect] AI available:   {gen.ai_available}")
print(f"[Auto-Detect] Backend info:   {gen.backend_info}")

print()

# Test 3: Force Ollama backend
gen_ollama = ReportGenerator(backend="ollama")
print(f"[Forced Ollama] Backend: {gen_ollama.active_backend}")
print(f"[Forced Ollama] Info:    {gen_ollama.backend_info}")

print()

# Test 4: Force template (always works)
gen_tpl = ReportGenerator(backend="template")
print(f"[Forced Template] Backend: {gen_tpl.active_backend}")

print()

# Test 5: API router health info
from api.intelligence_router import router
route_paths = [r.path for r in router.routes]
print(f"[API Router] {len(route_paths)} endpoints registered")

print()
print("=== ALL TESTS DONE ===")

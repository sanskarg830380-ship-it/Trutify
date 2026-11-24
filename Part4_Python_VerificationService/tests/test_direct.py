import sys
import os

# Add service root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app

async def run_all():
    print("🧪 Running direct FastAPI verification tests...")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Test 1: Root
        r1 = await client.get("/")
        assert r1.status_code == 200, f"Expected 200, got {r1.status_code}"
        assert r1.json()["service"] == "Trutify Verification Microservice"
        print("  ✅ PASS: Root endpoint returns HTTP 200 and operational status")

        # Test 2: Health
        r2 = await client.get("/health")
        assert r2.status_code == 200, f"Expected 200, got {r2.status_code}"
        assert r2.json()["status"] == "healthy"
        print("  ✅ PASS: Health endpoint returns HTTP 200 and healthy status")

        # Test 3: Verify with valid claim
        payload = {"claim": "The government has announced a nationwide school closure for one month."}
        r3 = await client.post("/api/verify", json=payload)
        assert r3.status_code == 200, f"Expected 200, got {r3.status_code}"
        data = r3.json()
        assert data["original_claim"] == payload["claim"]
        assert data["verdict"] in ["UNVERIFIED", "FALSE", "VERIFIED", "MISLEADING", "PARTIALLY TRUE"]
        assert 0 <= data["confidence"] <= 100
        assert isinstance(data["supporting_evidence"], list)
        print("  ✅ PASS: Verify endpoint returns HTTP 200 and matches Pydantic contract")

        # Test 4: Short claim validation error
        r4 = await client.post("/api/verify", json={"claim": "hi"})
        assert r4.status_code == 422, f"Expected 422, got {r4.status_code}"
        print("  ✅ PASS: Pydantic rejects claim shorter than 5 chars with HTTP 422")

        # Test 5: Missing claim validation error
        r5 = await client.post("/api/verify", json={})
        assert r5.status_code == 422, f"Expected 422, got {r5.status_code}"
        print("  ✅ PASS: Pydantic rejects missing claim field with HTTP 422")

    print("\n🎉 All 5 tests passed successfully!")

if __name__ == "__main__":
    asyncio.run(run_all())

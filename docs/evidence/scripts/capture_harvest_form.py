"""Chụp lại form Thu hoạch thật (chọn 'Thu hoạch' trong modal nhật ký).

Chạy khi backend (127.0.0.1:8000) và frontend (127.0.0.1:3000) đang chạy.
Ghi đè docs/evidence/screenshots/12-harvest-form.png.
"""
from __future__ import annotations

from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:3000"
OUT = Path("docs/evidence/screenshots/12-harvest-form.png")
PASSWORD = "GreenFarmDemo2026!"


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True, args=["--disable-dev-shm-usage"])
        context = browser.new_context(viewport={"width": 1440, "height": 900}, locale="vi-VN")
        page = context.new_page()

        page.goto(f"{BASE}/login", wait_until="networkidle", timeout=45000)
        page.fill("#login-username", "demo_admin@greenfarm.local")
        page.fill("#login-password", PASSWORD)
        page.press("#login-password", "Enter")
        page.wait_for_url(f"{BASE}/", timeout=30000)

        page.goto(f"{BASE}/care-logs", wait_until="networkidle", timeout=45000)
        page.wait_for_timeout(1200)
        page.get_by_text("Thêm ghi chép mới", exact=False).first.click(force=True)
        page.wait_for_timeout(1000)

        page.get_by_label("Loại hoạt động *").select_option(label="Thu hoạch")
        page.wait_for_timeout(800)
        page.get_by_label("Sản lượng thu được (Kg) *").fill("85")
        page.get_by_label("Tỷ lệ đạt chuẩn (%)").fill("92")
        page.wait_for_timeout(400)
        page.screenshot(path=str(OUT))
        print(f"SHOT {OUT}")

        context.close()
        browser.close()


if __name__ == "__main__":
    main()

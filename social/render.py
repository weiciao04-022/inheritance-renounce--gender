# 產生 social/ig_01.png … ig_06.png（1080×1350）
# 執行：python3 social/render.py（需 playwright + Chrome）
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
root = pathlib.Path(__file__).resolve().parent
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=sys.argv[1] if len(sys.argv) > 1 else None)
        pg = await b.new_page(viewport={"width": 1080, "height": 1350})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        for i in range(1, 7):
            await pg.goto((root / "social.html").as_uri() + f"?card={i}")
            await pg.wait_for_timeout(300)
            await pg.locator(".ig").screenshot(path=str(root / f"ig_{i:02d}.png"))
        print("errors:", errs)
        await b.close()
asyncio.run(main())

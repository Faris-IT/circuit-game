"""
Uji end-to-end di browser (Chromium via Playwright). Opsional; uji logika ada di tests/run-tests.js.

  pip install playwright && playwright install chromium
  python tests/e2e.py

Memeriksa: data localStorage rusak/terblokir, 12 mode di layar desktop/tablet/ponsel (tanpa overflow
dan tanpa error JavaScript), progres setelah reload, pintasan keyboard, dan opsi kurangi animasi.
"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json, sys
URL = (Path(__file__).resolve().parent.parent / 'index.html').as_uri()
MODES = ['classic','time-attack','maze','multi-target','move-limit','memory','daily','color-logic','unstable-grid','dual-circuit','endless','master']
problems = []
def note(ok, msg):
    print(('  OK  ' if ok else ' GAGAL ') + msg)
    if not ok: problems.append(msg)

def attach(page, errs):
    page.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    page.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' else None)

def dismiss(page):
    page.wait_for_selector('#board .tile', timeout=5000)
    page.wait_for_timeout(150)
    if page.locator('.modal').count():
        page.evaluate("document.querySelector('.modal-actions button').click()")
        page.wait_for_timeout(150)

def solve(page):
    for _ in range(150):
        info = page.evaluate("""() => { const s = MC.Game.s; if (!s) return null;
          if (MC.Engine.trace(s.board).solved) return {done:true};
          const h = s.board.twins ? MC.Dual.hint(s.board) : MC.Solver.hint(s.board);
          return h ? {idx:h.idx, clicks:h.clicks} : null; }""")
        if not info or info.get('done'): return True
        for _c in range(info['clicks']): page.click(f'#board .tile[data-idx="{info["idx"]}"]')
    return False

with sync_playwright() as p:
    b = p.chromium.launch()

    print('1. localStorage rusak / terblokir')
    garbage = ['{not json', 'null', '[]', '12345', '{"progress":5,"stats":"x","settings":null}',
               '{"stats":{"totalMoves":"banyak","dailyDays":"x"},"achievements":[1,2],"progress":{"classic":{"levels":{"0":{"stars":99}}}}}',
               '"' + 'A' * 200000 + '"']
    for g in garbage:
        ctx = b.new_context(); errs = []
        ctx.add_init_script("localStorage.setItem('mufa-circuit:v1', %s)" % json.dumps(g))
        pg = ctx.new_page(); attach(pg, errs); pg.goto(URL)
        vis = pg.is_visible('#screen-menu .btn, #screen-menu button')
        pg.evaluate("document.querySelector('[data-action=\"stats\"]').click()")
        pg.wait_for_selector('#screen-stats.active, #screen-stats:not([hidden])', timeout=3000)
        note(vis and not errs, 'data rusak "%s" -> game terbuka tanpa error' % g[:28].replace('\n',' '))
        ctx.close()
    ctx = b.new_context(); errs = []
    ctx.add_init_script("Storage.prototype.getItem=()=>{throw new Error('blocked')};Storage.prototype.setItem=()=>{throw new Error('blocked')}")
    pg = ctx.new_page(); attach(pg, errs); pg.goto(URL); pg.click('[data-action="play"]'); pg.click('.card[data-mode="classic"]')
    pg.click('[data-action="pick-level"][data-index="0"]'); dismiss(pg)
    ok = solve(pg); pg.click('[data-action="test"]'); pg.wait_for_selector('#screen-result.active, #screen-result:not([hidden])', timeout=5000)
    note(ok and not errs, 'localStorage diblokir -> tetap bisa bermain dan menang tanpa error ' + str(errs[:1]))
    ctx.close()

    print('2. Semua 12 mode, desktop dan mobile')
    for name, vp in [('desktop', {'width':1280,'height':800}), ('mobile', {'width':360,'height':740}), ('tablet', {'width':820,'height':1100})]:
        ctx = b.new_context(viewport=vp, has_touch=(name!='desktop')); errs = []
        pg = ctx.new_page(); attach(pg, errs); pg.goto(URL)
        for m in MODES:
            pg.evaluate("MC.UI.renderModes && MC.UI.renderModes(); MC.UI.show('modes')")
            pg.click(f'.card[data-mode="{m}"]')
            if m != 'daily' and m not in ('time-attack','endless'):
                pg.click('[data-action="pick-level"][data-index="0"]')
            pg.wait_for_selector('#board .tile', timeout=5000)
            if pg.locator('.modal').count():
                pg.evaluate("document.querySelector('.modal-actions button').click()")
            pg.wait_for_timeout(250)
            ov = pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            bd = pg.evaluate("(() => { const r = document.getElementById('board').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), r.left >= 0 && r.right <= window.innerWidth] })()")
            note(ov <= 0 and bd[2] and not errs, f'{name:7} {m:13} papan {bd[0]}x{bd[1]}px, overflow {ov}px' + (' ' + str(errs[:1]) if errs else ''))
            pg.evaluate("MC.Game.s && (MC.Game.s.over = true); MC.UI.show('modes')")
        ctx.close()

    print('3. Progres bertahan setelah reload')
    ctx = b.new_context(); errs = []
    pg = ctx.new_page(); attach(pg, errs); pg.goto(URL); pg.click('[data-action="play"]'); pg.click('.card[data-mode="classic"]')
    pg.click('[data-action="pick-level"][data-index="0"]'); dismiss(pg); solve(pg); pg.click('[data-action="test"]'); pg.wait_for_selector('#screen-result.active, #screen-result:not([hidden])')
    pg.reload()
    done = pg.evaluate("MC.Storage.data.stats.levelsCompleted")
    stars = pg.evaluate("JSON.stringify(MC.Storage.data.progress.classic.levels[0])")
    ach = pg.evaluate("Object.keys(MC.Storage.data.achievements)")
    note(done == 1 and 'first_connection' in str(ach) or done == 1, f'setelah reload: level selesai={done}, level1={stars}, achievement={ach}')
    ctx.close()

    print('4. Keyboard')
    ctx = b.new_context(); errs = []
    pg = ctx.new_page(); attach(pg, errs); pg.goto(URL); pg.click('[data-action="play"]'); pg.click('.card[data-mode="classic"]')
    pg.click('[data-action="pick-level"][data-index="0"]'); dismiss(pg)
    pg.locator('#board .tile:not(.locked)').first.focus()
    pg.keyboard.press('Space'); m1 = pg.evaluate("MC.Game.s.moves")
    pg.keyboard.press('z'); m2 = pg.evaluate("MC.Game.s.moves")
    pg.keyboard.press('Space'); pg.keyboard.press('Space'); pg.keyboard.press('r'); m3 = pg.evaluate("MC.Game.s.moves")
    pg.keyboard.press('h'); hints = pg.evaluate("MC.Game.s.hints")
    pg.keyboard.press('ArrowRight'); foc = pg.evaluate("document.activeElement.dataset.idx")
    pg.keyboard.press('Escape'); paused = pg.evaluate("!!document.querySelector('.modal') || MC.Game.s.paused")
    note(m1 == 1 and m2 == 0 and m3 == 0 and hints == 1 and not errs, f'Spasi putar={m1}, Z undo={m2}, R restart={m3}, H hint={hints}, panah fokus={foc}, Esc jeda={paused}')
    ctx.close()

    print('5. Kurangi animasi')
    ctx = b.new_context(); pg = ctx.new_page(); pg.goto(URL); pg.evaluate("document.querySelector('[data-action=\"settings\"]').click()")
    pg.check('#set-motion'); cls = pg.evaluate("document.documentElement.className + ' ' + document.body.className + ' ' + JSON.stringify(document.documentElement.dataset)")
    note('reduce' in cls.lower() or 'motion' in cls.lower(), 'opsi kurangi animasi mengubah kelas: ' + cls.strip())
    ctx.close()
    b.close()
print('\nRINGKASAN:', 'SEMUA LULUS' if not problems else f'{len(problems)} masalah: {problems}')
sys.exit(1 if problems else 0)

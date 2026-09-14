import os
import re
from collections import defaultdict

SRC_DIR = "src"

def analyze_modals():
    modals_dir = os.path.join(SRC_DIR, "components", "modals")
    modal_files = [f for f in os.listdir(modals_dir) if f.endswith(".tsx")]
    
    modal_data = {}
    for mf in modal_files:
        path = os.path.join(modals_dir, mf)
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
            
        # Find backdrop and container styles
        backdrop_match = re.findall(r'fixed inset-0[^"\'>]*', content)
        container_match = re.findall(r'motion\.div[^>]*className=["\']([^"\']+)["\']', content)
        
        # Check initial/animate opacity
        initial_match = re.findall(r'initial=\{([^}]+)\}', content)
        animate_match = re.findall(r'animate=\{([^}]+)\}', content)
        
        # Extract arbitrary classes
        arbitrary = re.findall(r'[a-zA-Z0-9_-]+-\[[^\]]+\]', content)
        
        # Extract opacities like bg-.../... or opacity-...
        opacities = re.findall(r'bg-[a-zA-Z0-9]+/[0-9]+|border-[a-zA-Z0-9]+/[0-9]+|opacity-[0-9]+', content)
        
        # Extract inline styles
        inline_styles = re.findall(r'style=\{\{([^}]+)\}\}', content)
        
        modal_data[mf] = {
            "backdrops": backdrop_match[:2],
            "containers": container_match[:2],
            "initials": initial_match[:2],
            "animates": animate_match[:2],
            "arbitrary_count": len(arbitrary),
            "arbitrary_sample": list(set(arbitrary))[:6],
            "opacities_sample": list(set(opacities))[:6],
            "inline_styles_count": len(inline_styles)
        }
    return modal_data

def scan_codebase():
    stats = {
        "inline_styles_total": 0,
        "inline_styles_by_file": defaultdict(int),
        "arbitrary_classes": defaultdict(int),
        "arbitrary_by_prefix": defaultdict(int),
        "opacity_classes": defaultdict(int),
        "slate_hardcoded": defaultdict(int),
        "z_index_classes": defaultdict(int),
        "rounded_classes": defaultdict(int),
        "padding_classes": defaultdict(int),
    }
    
    for root, _, files in os.walk(SRC_DIR):
        for file in files:
            if not file.endswith((".tsx", ".ts", ".css")):
                continue
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                
            # Inline styles
            styles = re.findall(r'style=\{\{([^}]+)\}\}', content)
            if styles:
                stats["inline_styles_total"] += len(styles)
                stats["inline_styles_by_file"][path] += len(styles)
                
            # Arbitrary Tailwind
            arbs = re.findall(r'([a-zA-Z0-9_-]+)-\[([^\]]+)\]', content)
            for prefix, val in arbs:
                stats["arbitrary_classes"][f"{prefix}-[{val}]"] += 1
                stats["arbitrary_by_prefix"][prefix] += 1
                
            # Opacities
            opacs = re.findall(r'(bg-[a-zA-Z0-9]+/[0-9]+|border-[a-zA-Z0-9]+/[0-9]+|text-[a-zA-Z0-9]+/[0-9]+)', content)
            for op in opacs:
                stats["opacity_classes"][op] += 1
                
            # Hardcoded slate
            slates = re.findall(r'bg-slate-[0-9]+(?:/[0-9]+)?', content)
            for sl in slates:
                stats["slate_hardcoded"][sl] += 1
                
            # z-index
            zs = re.findall(r'z-[a-zA-Z0-9\[\]_-]+', content)
            for z in zs:
                stats["z_index_classes"][z] += 1
                
            # rounded
            rounds = re.findall(r'rounded(?:-[a-zA-Z0-9]+)?', content)
            for r in rounds:
                stats["rounded_classes"][r] += 1

    return stats

if __name__ == "__main__":
    modals = analyze_modals()
    stats = scan_codebase()
    
    print("=== MODALS ANALYSIS ===")
    for m, d in sorted(modals.items()):
        print(f"\n[{m}]")
        print(f"  Container sample: {d['containers']}")
        print(f"  Initial/Animate: init={d['initials']} anim={d['animates']}")
        print(f"  Inline styles: {d['inline_styles_count']}")
        print(f"  Arbitrary: {d['arbitrary_count']} ({d['arbitrary_sample']})")
        print(f"  Opacities sample: {d['opacities_sample']}")
        
    print("\n=== TOTAL CODEBASE STATS ===")
    print(f"Total inline styles: {stats['inline_styles_total']}")
    print(f"Top 5 files with inline styles: {sorted(stats['inline_styles_by_file'].items(), key=lambda x: -x[1])[:8]}")
    print(f"\nArbitrary classes count: {sum(stats['arbitrary_classes'].values())}")
    print(f"Arbitrary by prefix: {sorted(stats['arbitrary_by_prefix'].items(), key=lambda x: -x[1])[:10]}")
    print(f"\nTop 10 arbitrary classes: {sorted(stats['arbitrary_classes'].items(), key=lambda x: -x[1])[:15]}")
    print(f"\nTop 10 opacity classes: {sorted(stats['opacity_classes'].items(), key=lambda x: -x[1])[:15]}")
    print(f"\nTop 10 hardcoded slate: {sorted(stats['slate_hardcoded'].items(), key=lambda x: -x[1])[:15]}")
    print(f"\nTop 10 z-index classes: {sorted(stats['z_index_classes'].items(), key=lambda x: -x[1])[:10]}")

from PIL import Image, ImageDraw

S = 512
img = Image.new("RGB", (S, S), "#0b2545")
d = ImageDraw.Draw(img)
c = S // 2
for r, w in ((190, 14), (125, 12), (60, 10)):
    d.ellipse([c - r, c - r, c + r, c + r], outline="#e9f1fa", width=w)
d.line([c, c - 190, c, c + 190], fill="#4da3ff", width=8)
d.line([c - 190, c, c + 190, c], fill="#4da3ff", width=8)
d.ellipse([c - 22, c - 22, c + 22, c + 22], fill="#ff6b6b")
img.save("icon-512.png")
img.resize((192, 192), Image.LANCZOS).save("icon-192.png")
img.resize((180, 180), Image.LANCZOS).save("apple-touch-icon.png")
print("Zapisano ikony")

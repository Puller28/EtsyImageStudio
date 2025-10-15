from fastapi import FastAPI, File, UploadFile
from fastapi.responses import Response, JSONResponse
from rembg import remove
from PIL import Image
import io

app = FastAPI()


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/mask")
async def mask(image: UploadFile = File(...)):
    try:
        raw = await image.read()
        out = remove(raw)
        return Response(content=out, media_type="image/png")
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": str(exc)})


@app.post("/alpha")
async def alpha(image: UploadFile = File(...)):
    try:
        raw = await image.read()
        out = remove(raw)
        img = Image.open(io.BytesIO(out)).convert("RGBA")
        alpha = img.split()[-1]
        buf = io.BytesIO()
        alpha.save(buf, format="PNG")
        return Response(content=buf.getvalue(), media_type="image/png")
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": str(exc)})

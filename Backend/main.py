from fastapi import FastAPI, UploadFile, File, HTTPException
import tensorflow as tf
import numpy as np
from PIL import Image
import io
from fastapi.middleware.cors import CORSMiddleware
import cv2
import base64
import logging
import torch

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(title="Plant Analysis API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Load Disease Classification Model ----
try:
    disease_model = tf.keras.models.load_model("plant_disease_model.h5", compile=False)
    logger.info("✅ Disease classification model loaded successfully")
except Exception as e:
    logger.error(f"❌ Failed to load disease model: {e}")
    disease_model = None

# Disease classification parameters
IMG_SIZE = (128, 128)
class_labels = [
    "Bacterial Spot", "Black Rot", "Blight", "Healthy", 
    "Leaf Spot", "MildDew", "Others", "Rust"
]

# ---- Load YOLO Model for Leaf Detection ----
leaf_detection_model = None
try:
    from ultralyticsplus import YOLO, render_result

    # Patch torch.load to prevent weight-only errors
    original_load = torch.load
    def patched_load(*args, **kwargs):
        if 'weights_only' not in kwargs:
            kwargs['weights_only'] = False
        return original_load(*args, **kwargs)
    
    torch.load = patched_load  # Apply patch

    try:
        leaf_detection_model = YOLO('foduucom/plant-leaf-detection-and-classification')
        torch.load = original_load  # Reset after loading
        
        # Set YOLO parameters
        leaf_detection_model.overrides['conf'] = 0.25
        leaf_detection_model.overrides['iou'] = 0.45
        leaf_detection_model.overrides['agnostic_nms'] = False
        leaf_detection_model.overrides['max_det'] = 1000

        logger.info("✅ YOLO model loaded successfully")
    except Exception as e:
        torch.load = original_load  # Reset even if load fails
        logger.error(f"❌ Failed to initialize YOLO: {e}")
except ImportError:
    logger.warning("⚠️ Ultralytics package not available - YOLO features disabled")


# ---- Image Preprocessing ----
def preprocess_image(img: Image.Image) -> np.ndarray:
    """Preprocess image for disease classification"""
    img = img.resize(IMG_SIZE)
    img_array = np.array(img) / 255.0  # Normalize
    img_array = np.expand_dims(img_array, axis=0)
    return img_array


# ---- Disease Classification Endpoint ----
@app.post("/predict")
async def predict_disease(file: UploadFile = File(...)):
    """Predicts plant disease from an uploaded image"""
    if not disease_model:
        raise HTTPException(status_code=503, detail="Disease model not available")
    
    try:
        img = Image.open(io.BytesIO(await file.read()))
        img_array = preprocess_image(img)
        
        prediction = disease_model.predict(img_array)
        predicted_class = np.argmax(prediction)
        predicted_label = class_labels[predicted_class]
        confidence = float(np.max(prediction))
        
        return {
            "prediction": predicted_label,
            "confidence": confidence,
            "model": "Disease Classification"
        }
    except Exception as e:
        logger.error(f"❌ Disease prediction error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ---- Leaf Detection Endpoint ----
@app.post("/detect-leaves")
async def detect_leaves(file: UploadFile = File(...)):
    """Detects leaves and their classification from an uploaded image"""
    if not leaf_detection_model:
        raise HTTPException(status_code=503, detail="Leaf detection model not available")
    
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)  # Convert from BGR to RGB
        
        # Perform YOLO detection
        results = leaf_detection_model.predict(img)
        
        # Process results
        detections = []
        for box in results[0].boxes:
            class_index = int(box.cls.item())  # Convert tensor to int
            class_name = leaf_detection_model.model.names[class_index]  # Get class name
            
            detections.append({
                "class": class_name,
                "confidence": float(box.conf.item()),
                "bbox": [float(coord) for coord in box.xyxy[0].tolist()]
            })
        
        # Generate visualization
        render = render_result(model=leaf_detection_model, image=img, result=results[0])
        render = cv2.cvtColor(np.array(render), cv2.COLOR_RGB2BGR)  # Convert back to BGR for OpenCV
        _, buffer = cv2.imencode('.jpg', render)
        img_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return {
            "detections": detections,
            "image_with_boxes": img_base64,
            "model": "Leaf Detection"
        }
    except Exception as e:
        logger.error(f"❌ Leaf detection error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ---- Run FastAPI Server ----
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

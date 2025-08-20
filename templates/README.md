# Template Structure

This folder contains mockup templates organized by room type. Each template includes:

## Structure
```
templates/
├── living_room/
│   ├── living_01/
│   │   ├── manifest.json
│   │   └── bg.png
│   └── living_02/
│       ├── manifest.json
│       └── bg.png
├── bedroom/
│   ├── bedroom_01/
│   │   ├── manifest.json
│   │   └── bg.png
│   └── ...
└── study/
    └── ...
```

## Manifest Format
Each template folder must contain a `manifest.json` file:

```json
{
  "name": "Modern Living Room",
  "description": "Contemporary living room with neutral tones",
  "background": "bg.png",
  "width": 1024,
  "height": 1024,
  "corners": [
    [200, 150],  // Top-left
    [800, 150],  // Top-right
    [800, 750],  // Bottom-right
    [200, 750]   // Bottom-left
  ],
  "feather_px": 2.0,
  "blend": {
    "mode": "normal",
    "opacity": 1.0
  }
}
```

## Corner Points
The `corners` array defines the quadrilateral where artwork will be placed:
- Points are in [x, y] format
- Order: Top-Left, Top-Right, Bottom-Right, Bottom-Left
- Coordinates relative to background image dimensions
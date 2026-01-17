# Using GLB Files for AR Clothing

This guide explains how to use your GLB t-shirt file (1,285KB) in the AR clothing platform.

## Step 1: Place Your GLB File

1. Create a `models` folder in the `frontend/public` directory:
   ```
   frontend/public/models/
   ```

2. Place your GLB t-shirt file in this folder. For example:
   ```
   frontend/public/models/tshirt.glb
   ```

   The file will be accessible at the URL: `/models/tshirt.glb`

## Step 2: Add to Clothing Items

Update `frontend/src/components/ClothingSelector.jsx` to add your GLB t-shirt:

```javascript
{
  id: 'tshirt-glb-1',
  name: 'My GLB T-Shirt',
  type: 'tshirt',
  category: 'tops',
  thumbnail: '👕',
  description: '3D model t-shirt',
  modelUrl: '/models/tshirt.glb'  // Path to your GLB file
}
```

## How It Works

The `ClothingManager` class will:
1. Load the GLB file using Three.js `GLTFLoader`
2. Extract all meshes from the GLB model
3. Position and scale the model based on detected body pose
4. Overlay it on the person in real-time

## Model Requirements

For best results, your GLB model should:
- Be positioned at the origin (0, 0, 0) when exported
- Have a reasonable scale (not too large or small)
- Face the correct direction (typically front-facing)
- Include materials/textures if you want them to appear

## Adjusting Scale

If the t-shirt appears too large or too small, you can adjust the scale in `ClothingManager.js`:

In the `updatePosition` method, find this line:
```javascript
const scaleMultiplier = this.currentClothing?.modelUrl ? 1.0 : 1.0
```

Change the multiplier to adjust the size:
- `0.5` = half size
- `1.0` = normal size (default)
- `2.0` = double size

## Troubleshooting

1. **Model not appearing**: 
   - Check browser console for loading errors
   - Verify the file path is correct
   - Ensure the GLB file is not corrupted

2. **Model appears in wrong position**:
   - The model should be centered at origin in your 3D software
   - Rotate or reposition the model in your 3D editor before exporting

3. **Model appears too large/small**:
   - Adjust the `scaleMultiplier` as mentioned above
   - Or resize the model in your 3D editor before exporting

4. **Model appears upside down or rotated incorrectly**:
   - Check the model's orientation in your 3D editor
   - You may need to rotate it 180° on the appropriate axis

## Example

Here's a complete example clothing item:

```javascript
{
  id: 'my-tshirt',
  name: 'Custom T-Shirt',
  type: 'tshirt',
  category: 'tops',
  thumbnail: '👕',
  description: 'My custom 3D t-shirt model',
  modelUrl: '/models/tshirt.glb'
}
```

After adding this to `CLOTHING_ITEMS` in `ClothingSelector.jsx`, you can select it from the clothing selector and it will overlay on your body using AR!
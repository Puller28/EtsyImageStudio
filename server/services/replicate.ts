export async function upscaleImage(imageUrl: string, scale: "2x" | "4x"): Promise<string> {
  try {
    const replicateApiKey = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY || "default_key";
    
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${replicateApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "42fed1c4974146d4d2414e2be2c5277c7fcf05fcc972b74e1c9e617c23b7bdde",
        input: {
          image: imageUrl,
          scale: parseInt(scale.replace("x", "")),
          face_enhance: false,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Replicate API error: ${response.statusText}`);
    }

    const prediction = await response.json();
    
    // Poll for completion
    let result = prediction;
    while (result.status === "starting" || result.status === "processing") {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: {
          "Authorization": `Token ${replicateApiKey}`,
        },
      });
      
      result = await pollResponse.json();
    }

    if (result.status === "failed") {
      throw new Error("Image upscaling failed");
    }

    return result.output;
  } catch (error) {
    throw new Error("Failed to upscale image: " + (error as Error).message);
  }
}

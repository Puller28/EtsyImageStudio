import JSZip from "jszip";

export async function generateProjectZip(projectData: {
  originalImage: Buffer;
  upscaledImage: Buffer;
  resizedImages: { [format: string]: Buffer };
  mockupImages: { [mockupId: string]: Buffer };
  etsyListing: {
    title: string;
    tags: string[];
    description: string;
  };
  projectTitle: string;
}): Promise<Buffer> {
  const zip = new JSZip();
  
  // Add original and upscaled images
  zip.file("01_original.jpg", projectData.originalImage);
  zip.file("02_upscaled.jpg", projectData.upscaledImage);
  
  // Add resized images
  const printFormats = zip.folder("print-formats");
  if (printFormats) {
    Object.entries(projectData.resizedImages).forEach(([format, buffer]) => {
      printFormats.file(`${format}.jpg`, buffer);
    });
  }
  
  // Add all 5 mockups
  const mockupsFolder = zip.folder("mockups");
  if (mockupsFolder) {
    Object.entries(projectData.mockupImages).forEach(([mockupId, buffer], index) => {
      mockupsFolder.file(`${String(index + 1).padStart(2, '0')}_${mockupId.replace(/[^a-z0-9]/gi, '_')}.jpg`, buffer);
    });
  }
  
  // Add Etsy listing text
  const listingText = `ETSY LISTING CONTENT
${projectData.projectTitle}

TITLE (${projectData.etsyListing.title.length}/140 characters):
${projectData.etsyListing.title}

TAGS (${projectData.etsyListing.tags.length}/13):
${projectData.etsyListing.tags.join(", ")}

DESCRIPTION:
${projectData.etsyListing.description}

FILES INCLUDED:
- 5 High-resolution print formats (4x5, 3x4, 2x3, 11x14, A4)
- 5 Professional styled mockups for your listings
- All files are 300 DPI, ready for printing

INSTANT DOWNLOAD - No physical item will be shipped.
`;
  
  zip.file("etsy-listing.txt", listingText);
  
  return zip.generateAsync({ type: "nodebuffer" });
}

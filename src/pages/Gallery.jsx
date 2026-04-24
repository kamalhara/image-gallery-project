import { useEffect, useRef, useState } from "react";
import { RxCross1 } from "react-icons/rx";
import { Grid } from "react-window";

export default function Gallery() {
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const worker = new Worker(
    new URL("../worker/imageProcessor.worker.js", import.meta.url),
    { type: "module" },
  );

  useEffect(() => {
    const fetchImages = async () => {
      setIsLoading(true);
      const response = await fetch(
        "https://picsum.photos/v2/list?page=1&limit=100",
      );
      const data = await response.json();
      setImages(data);
      setIsLoading(false);
    };
    fetchImages();
  }, []);

  const downloadImage = async (imageUrl) => {
    const canvas = document.createElement("canvas");

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      worker.postMessage(img.src);

      worker.onmessage = (e) => {
        const blob = e.data;
        const url = URL.createObjectURL(blob);

        // download
        const link = document.createElement("a");
        link.download = "watermarked-image.png";
        link.href = url;
        link.click();
      };
    };
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    } else {
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  const handleSelectAllImages = () => {
    if (selectedIds.length === images.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(images.map((image) => image.id));
    }
  };

  const downloadSelected = () => {
    selectedIds.forEach((id) => {
      const image = images.find((img) => img.id === id);
      if (image) {
        downloadImage(image.download_url);
      }
    });
  };
  const gridContainerRef = useRef(null);
  const [gridSize, setGridSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!gridContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setGridSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(gridContainerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Gallery
        </h1>
        <div className="space-x-3">
          <button
            onClick={downloadSelected}
            disabled={selectedIds.length === 0}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Download Selected
          </button>
          <button
            onClick={handleSelectAllImages}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors"
          >
            {selectedIds.length === images.length && images.length > 0
              ? "Deselect All"
              : "Select All Images"}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div
        ref={gridContainerRef}
        className="w-full h-[75vh] border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden relative"
      >
        {gridSize.width > 0 &&
          gridSize.height > 0 &&
          (() => {
            const { width, height } = gridSize;
            const currentColumnCount = Math.max(1, Math.floor(width / 260));
            const currentRowCount = Math.ceil(
              images.length / currentColumnCount,
            );
            const currentColumnWidth = width / currentColumnCount;

            return (
              <Grid
                columnCount={currentColumnCount}
                rowCount={currentRowCount}
                height={height}
                width={width}
                columnWidth={currentColumnWidth}
                rowHeight={260}
                cellProps={{}}
                cellComponent={({ columnIndex, rowIndex, style }) => {
                  if (isLoading) {
                    return (
                      <div style={style} className="p-3">
                        <div className="w-full h-full bg-gray-100 rounded-lg animate-pulse"></div>
                      </div>
                    );
                  }

                  const index = rowIndex * currentColumnCount + columnIndex;
                  const image = images[index];
                  if (!image) return null;

                  const isSelected = selectedIds.includes(image.id);

                  return (
                    <div style={style} className="p-3">
                      <div className="relative group w-full h-full rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 bg-gray-50 flex items-center justify-center">
                        <img
                          onClick={() => setSelectedImage(image)}
                          className="w-full h-full object-cover cursor-pointer group-hover:scale-[1.03] transition-transform duration-300"
                          src={image.download_url}
                          alt={image.author}
                          loading="lazy"
                        />
                        <div className="absolute top-3 left-3 z-10">
                          <input
                            type="checkbox"
                            onChange={() => toggleSelect(image.id)}
                            checked={isSelected}
                            className="w-5 h-5 cursor-pointer rounded border-gray-300 text-gray-900 focus:ring-gray-900 shadow-sm transition-opacity opacity-0 group-hover:opacity-100 checked:opacity-100"
                          />
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
            );
          })()}
      </div>

      {/* Bottom Selection Tray */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] px-6 py-4 flex justify-between items-center z-40">
          <span className="text-gray-700 font-medium">
            {selectedIds.length} image{selectedIds.length > 1 ? "s" : ""}{" "}
            selected
          </span>
          <div className="space-x-4">
            <button
              onClick={() => setSelectedIds([])}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Clear Selection
            </button>
            <button
              onClick={downloadSelected}
              className="px-6 py-2 text-sm font-medium text-white bg-gray-900 rounded-md shadow-sm hover:bg-gray-800 transition-colors"
            >
              Download Selected
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-4xl w-full flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Image Preview</h3>
              <button
                className="p-1 text-gray-400 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-100"
                onClick={() => setSelectedImage("")}
              >
                <RxCross1 size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-50 p-6 flex justify-center items-center">
              <img
                src={selectedImage.download_url}
                alt={selectedImage.author}
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm"
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center bg-white">
              <p className="text-sm text-gray-600">
                Photo by{" "}
                <span className="font-medium text-gray-900">
                  {selectedImage.author}
                </span>
              </p>
              <button
                onClick={() => downloadImage(selectedImage.download_url)}
                className="px-5 py-2 text-sm font-medium text-white bg-gray-900 rounded-md shadow-sm hover:bg-gray-800 transition-colors"
              >
                Download Image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

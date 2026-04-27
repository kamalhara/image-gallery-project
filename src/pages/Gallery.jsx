import { useEffect, useRef, useState, useCallback } from "react";
import { RxCross1 } from "react-icons/rx";
import { Grid } from "react-window";
import { getImages, saveImages } from "../utils/indexedDB";
import {
  setCachedImage,
  getCachedImage,
  hasCachedImage,
} from "../utils/imageCache";

// Cell component defined outside to avoid re-creation on every render
// react-window v2 spreads cellProps directly as props to cellComponent
const ImageCell = ({
  columnIndex,
  rowIndex,
  style,
  images,
  columnCount,
  isLoading,
  selectedIds,
  toggleSelect,
  setSelectedImage,
  downloadImage,
}) => {
  if (isLoading) {
    return (
      <div style={style} className="p-3">
        <div className="w-full h-full bg-gray-100 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  const index = rowIndex * columnCount + columnIndex;
  const image = images[index];
  if (!image) return null;

  const isSelected = selectedIds.includes(image.id);

  // Use in-memory cached blob URL if available, otherwise use original URL
  const cachedUrl = getCachedImage(image.download_url);
  const displayUrl = cachedUrl || image.download_url;

  const handleImageLoad = (e) => {
    // If not already cached in memory, fetch and create a blob URL for in-memory caching
    if (!hasCachedImage(image.download_url)) {
      const img = e.target;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const blobUrl = URL.createObjectURL(blob);
            setCachedImage(image.download_url, blobUrl);
          }
        });
      } catch {
        // CORS may block canvas — just mark as cached without blob
        setCachedImage(image.download_url, image.download_url);
      }
    }
  };

  return (
    <div style={style} className="p-3">
      <div className="relative group w-full h-full rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 bg-gray-50 flex items-center justify-center">
        <img
          onClick={() => setSelectedImage(image)}
          className="w-full h-full object-cover cursor-pointer group-hover:scale-[1.03] transition-transform duration-300"
          src={displayUrl}
          alt={image.author}
          loading="lazy"
          crossOrigin="anonymous"
          onLoad={handleImageLoad}
        />
        <div className="absolute top-3 left-3 z-10">
          <input
            type="checkbox"
            onChange={() => toggleSelect(image.id)}
            checked={isSelected}
            className="w-5 h-5 cursor-pointer rounded border-gray-300 text-gray-900 focus:ring-gray-900 shadow-sm transition-opacity opacity-0 group-hover:opacity-100 checked:opacity-100"
          />
        </div>
        <div className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              downloadImage(image.download_url);
            }}
            className="bg-black/70 hover:bg-black text-white px-3 py-1.5 rounded-md text-xs font-medium backdrop-blur-sm transition-colors shadow-sm"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Gallery() {
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isCached, setIsCached] = useState(false);

  // Create worker once using useRef to avoid re-creating on every render
  const workerRef = useRef(null);
  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../worker/imageProcessor.worker.js", import.meta.url),
      { type: "module" },
    );
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    const loadImages = async () => {
      setIsLoading(true);

      const cached = await getImages();

      if (cached.length > 0) {
        console.log("✅ Loaded from IndexedDB cache");
        setImages(cached);
        setIsCached(true);
      } else {
        console.log("🌐 Fetching from network...");
        const response = await fetch(
          "https://picsum.photos/v2/list?page=1&limit=100",
        );

        const data = await response.json();

        setImages(data);
        await saveImages(data);
        setIsCached(false);
      }

      setIsLoading(false);
    };

    loadImages();
  }, []);

  const downloadImage = useCallback((imageUrl) => {
    if (!workerRef.current) return;

    workerRef.current.postMessage(imageUrl);

    workerRef.current.onmessage = (e) => {
      const blob = e.data;
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.download = "watermarked-image.png";
      link.href = url;
      link.click();

      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
  }, []);

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }, []);

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
    <>
      {isCached && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2 mb-4 text-sm font-medium">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          Loaded from IndexedDB cache
        </div>
      )}
      <div className="flex flex-col h-full space-y-6">
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
              Download Selected Images
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

        <div
          ref={gridContainerRef}
          className="w-full h-[85vh] border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden relative"
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
                  width={width}
                  height={height}
                  columnWidth={currentColumnWidth}
                  rowHeight={260}
                  cellProps={{
                    images,
                    columnCount: currentColumnCount,
                    isLoading,
                    selectedIds,
                    toggleSelect,
                    setSelectedImage,
                    // eslint-disable-next-line react-hooks/refs
                    downloadImage,
                  }}
                  cellComponent={ImageCell}
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
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setSelectedImage("")}
          >
            <div
              className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-4xl w-full flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
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
    </>
  );
}

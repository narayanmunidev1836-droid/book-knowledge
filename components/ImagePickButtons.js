"use client";

import { useRef } from "react";
import { PictureOutlined, CameraOutlined } from "@ant-design/icons";

// "Choose from Gallery" everywhere, plus "Take Photo" on mobile only
// (a bare `capture` input would force the camera and hide the gallery).
export default function ImagePickButtons({ onChange, multiple = false }) {
  const galleryRef = useRef(null);
  const cameraRef = useRef(null);

  return (
    <>
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={onChange}
        className="hidden"
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onChange}
        className="hidden"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          className="btn-ghost !py-2 text-sm"
        >
          <PictureOutlined /> Choose from Gallery
        </button>
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="btn-ghost !py-2 text-sm"
          >
            <CameraOutlined /> Take Photo
          </button>
        </div>
      </div>
    </>
  );
}

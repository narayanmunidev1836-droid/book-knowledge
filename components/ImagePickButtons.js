"use client";

import { useRef } from "react";
import { CameraOutlined, PictureOutlined } from "@ant-design/icons";

// Mouse devices: the plain file input (gallery / files).
// Touch devices (phone + tablet): a big camera box and a small gallery icon.
// A bare `capture` input would force the camera and hide the gallery, so each
// source gets its own input.
export default function ImagePickButtons({ onChange, multiple = false }) {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  return (
    <>
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={onChange}
        className="input text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1 file:text-emerald-700 pointer-coarse:hidden"
      />

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onChange}
        className="hidden"
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={onChange}
        className="hidden"
      />
      <div className="hidden items-stretch gap-2 pointer-coarse:flex">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="btn-ghost flex-1 !border-emerald-300 !bg-emerald-50 !py-2 !text-sm !font-semibold !text-emerald-700"
        >
          <CameraOutlined className="!text-xl" />
          Take Photo
        </button>
        <button
          type="button"
          aria-label="Choose from gallery"
          title="Gallery"
          onClick={() => galleryRef.current?.click()}
          className="btn-ghost !px-4 !text-xl !text-slate-600"
        >
          <PictureOutlined />
        </button>
      </div>
    </>
  );
}

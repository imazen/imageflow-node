// Wire-format response types matching imageflow JSON API

export interface Response001 {
  code: number;
  success: boolean;
  message?: string;
  data: ResponsePayload;
}

export type ResponsePayload =
  | { image_info: ImageInfo }
  | { job_result: JobResult }
  | { build_result: JobResult }
  | { version_info: VersionInfo }
  | { none: null };

export interface ImageInfo {
  image_width: number;
  image_height: number;
  preferred_mime_type: string;
  preferred_extension: string;
  frame_decodes_into?: string;
  frame_count?: number;
  current_frame_index?: number;
}

export interface JobResult {
  encodes: EncodeResult[];
  decodes?: DecodeResult[];
}

export interface EncodeResult {
  preferred_mime_type: string;
  preferred_extension: string;
  io_id: number;
  w: number;
  h: number;
  bytes: string;
}

export interface DecodeResult {
  io_id: number;
  w: number;
  h: number;
  preferred_mime_type: string;
  preferred_extension: string;
}

export interface VersionInfo {
  long_version_string: string;
  last_git_commit: string;
  dirty_working_tree: boolean;
  build_date: string;
}

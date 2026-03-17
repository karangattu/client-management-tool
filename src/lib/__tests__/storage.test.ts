import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, fromMock } = vi.hoisted(() => {
  const fromMock = vi.fn();
  const createClient = vi.fn(() => ({
    storage: {
      from: fromMock,
    },
  }));

  return { createClient, fromMock };
});

vi.mock("../supabase/client", () => ({
  createClient,
}));

import {
  BUCKETS,
  deleteFile,
  getDocumentSignedUrl,
  listFiles,
  uploadClientDocument,
  uploadProfilePicture,
  uploadSignature,
} from "../supabase/storage";

type BucketMock = {
  upload: ReturnType<typeof vi.fn>;
  getPublicUrl: ReturnType<typeof vi.fn>;
  createSignedUrl: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  list: ReturnType<typeof vi.fn>;
};

function createBucketMock(overrides: Partial<BucketMock> = {}): BucketMock {
  return {
    upload: vi.fn().mockResolvedValue({ data: { path: "stored/path" }, error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://cdn.example.com/public" } }),
    createSignedUrl: vi.fn().mockResolvedValue({
      data: { signedUrl: "https://cdn.example.com/signed" },
      error: null,
    }),
    remove: vi.fn().mockResolvedValue({ error: null }),
    list: vi.fn().mockResolvedValue({
      data: [{ name: "doc.pdf", id: "1", created_at: "2026-01-01T00:00:00Z" }],
      error: null,
    }),
    ...overrides,
  };
}

function mockBuckets(buckets: Record<string, BucketMock>) {
  fromMock.mockImplementation((bucketName: string) => {
    const bucket = buckets[bucketName];
    if (!bucket) {
      throw new Error(`No mock configured for bucket: ${bucketName}`);
    }
    return bucket;
  });
}

describe("supabase storage helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    fromMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects invalid profile picture file types", async () => {
    const profileBucket = createBucketMock();
    mockBuckets({ [BUCKETS.PROFILE_PICTURES]: profileBucket });

    const result = await uploadProfilePicture(
      { name: "avatar.txt", type: "text/plain", size: 100 } as File,
      "user-1"
    );

    expect(result).toEqual({
      url: null,
      error: "Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.",
    });
    expect(profileBucket.upload).not.toHaveBeenCalled();
  });

  it("rejects oversized profile pictures", async () => {
    const profileBucket = createBucketMock();
    mockBuckets({ [BUCKETS.PROFILE_PICTURES]: profileBucket });

    const result = await uploadProfilePicture(
      { name: "avatar.png", type: "image/png", size: 6 * 1024 * 1024 } as File,
      "user-1"
    );

    expect(result).toEqual({
      url: null,
      error: "File too large. Maximum size is 5MB.",
    });
    expect(profileBucket.upload).not.toHaveBeenCalled();
  });

  it("uploads profile pictures and returns public URL", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);
    const profileBucket = createBucketMock({
      upload: vi.fn().mockResolvedValue({ data: { path: "user/user-7/1700000000000.png" }, error: null }),
      getPublicUrl: vi
        .fn()
        .mockReturnValue({ data: { publicUrl: "https://cdn.example.com/avatar.png" } }),
    });
    mockBuckets({ [BUCKETS.PROFILE_PICTURES]: profileBucket });

    const file = { name: "avatar.png", type: "image/png", size: 1024 } as File;
    const result = await uploadProfilePicture(file, "user-7", "user");

    expect(profileBucket.upload).toHaveBeenCalledWith("user/user-7/1700000000000.png", file, {
      cacheControl: "3600",
      upsert: true,
    });
    expect(profileBucket.getPublicUrl).toHaveBeenCalledWith("user/user-7/1700000000000.png");
    expect(result).toEqual({ url: "https://cdn.example.com/avatar.png", error: null });
  });

  it("returns upload errors for profile pictures", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const profileBucket = createBucketMock({
      upload: vi.fn().mockResolvedValue({ data: null, error: { message: "upload failed" } }),
    });
    mockBuckets({ [BUCKETS.PROFILE_PICTURES]: profileBucket });

    const result = await uploadProfilePicture(
      { name: "avatar.png", type: "image/png", size: 100 } as File,
      "user-1"
    );

    expect(result).toEqual({ url: null, error: "upload failed" });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("validates client document type and size", async () => {
    const docsBucket = createBucketMock();
    mockBuckets({ [BUCKETS.CLIENT_DOCUMENTS]: docsBucket });

    const invalidType = await uploadClientDocument(
      { name: "data.exe", type: "application/x-msdownload", size: 100 } as File,
      "client-1",
      "id"
    );
    expect(invalidType.error).toBe(
      "Invalid file type. Please upload a PDF, Word document, Excel file, or image."
    );
    expect(docsBucket.upload).not.toHaveBeenCalled();

    const oversized = await uploadClientDocument(
      { name: "big.pdf", type: "application/pdf", size: 26 * 1024 * 1024 } as File,
      "client-1",
      "id"
    );
    expect(oversized.error).toBe("File too large. Maximum size is 25MB.");
    expect(docsBucket.upload).not.toHaveBeenCalled();
  });

  it("uploads client documents and returns a document record", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1700000000001);
    const docsBucket = createBucketMock({
      upload: vi
        .fn()
        .mockResolvedValue({ data: { path: "client-5/id/1700000000001-intake.pdf" }, error: null }),
    });
    mockBuckets({ [BUCKETS.CLIENT_DOCUMENTS]: docsBucket });

    const file = { name: "intake.pdf", type: "application/pdf", size: 2048 } as File;
    const result = await uploadClientDocument(file, "client-5", "id", "Intake document");

    expect(docsBucket.upload).toHaveBeenCalledWith(
      "client-5/id/1700000000001-intake.pdf",
      file,
      {
        cacheControl: "3600",
        upsert: false,
      }
    );
    expect(result).toEqual({
      document: {
        client_id: "client-5",
        document_type: "id",
        file_name: "intake.pdf",
        file_path: "client-5/id/1700000000001-intake.pdf",
        file_size: 2048,
        mime_type: "application/pdf",
        description: "Intake document",
      },
      error: null,
    });
  });

  it("uploads signatures from data URLs and enforces size limits", async () => {
    const signatureBucket = createBucketMock({
      upload: vi.fn().mockResolvedValue({ data: { path: "client-2/request-9.png" }, error: null }),
    });
    mockBuckets({ [BUCKETS.SIGNATURES]: signatureBucket });

    const fetchMock = vi.fn().mockResolvedValue({
      blob: vi.fn().mockResolvedValue(new Blob(["tiny-signature"])),
    });
    vi.stubGlobal("fetch", fetchMock);

    const success = await uploadSignature("data:image/png;base64,AAAA", "client-2", "request-9");
    expect(signatureBucket.upload).toHaveBeenCalledWith("client-2/request-9.png", expect.any(Blob), {
      cacheControl: "31536000",
      upsert: false,
      contentType: "image/png",
    });
    expect(success).toEqual({ path: "client-2/request-9.png", error: null });

    const largeBlob = new Blob([new Uint8Array(1_100_000)]);
    fetchMock.mockResolvedValueOnce({
      blob: vi.fn().mockResolvedValue(largeBlob),
    });

    const tooLarge = await uploadSignature("data:image/png;base64,BBBB", "client-2", "request-10");
    expect(tooLarge).toEqual({ path: null, error: "Signature image too large." });
  });

  it("returns error on signature upload failure", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const signatureBucket = createBucketMock({
      upload: vi.fn().mockResolvedValue({ data: null, error: { message: "signature upload failed" } }),
    });
    mockBuckets({ [BUCKETS.SIGNATURES]: signatureBucket });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ blob: vi.fn().mockResolvedValue(new Blob(["ok"])) })
    );

    const result = await uploadSignature("data:image/png;base64,AAAA", "client-2", "request-11");

    expect(result).toEqual({ path: null, error: "signature upload failed" });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("creates signed URLs with defaults and handles errors", async () => {
    const docsBucket = createBucketMock({
      createSignedUrl: vi
        .fn()
        .mockResolvedValueOnce({ data: { signedUrl: "https://cdn.example.com/s1" }, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: "signed url failed" } }),
    });
    mockBuckets({ [BUCKETS.CLIENT_DOCUMENTS]: docsBucket });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const success = await getDocumentSignedUrl("client-1/id/a.pdf");
    expect(docsBucket.createSignedUrl).toHaveBeenCalledWith("client-1/id/a.pdf", 3600);
    expect(success).toEqual({ url: "https://cdn.example.com/s1", error: null });

    const failure = await getDocumentSignedUrl("client-1/id/a.pdf");
    expect(failure).toEqual({ url: null, error: "signed url failed" });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("deletes files and lists files with mapped output and error handling", async () => {
    const docsBucket = createBucketMock({
      remove: vi
        .fn()
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: { message: "delete failed" } }),
      list: vi
        .fn()
        .mockResolvedValueOnce({
          data: [
            { name: "a.pdf", id: "a1", created_at: "2026-01-01T00:00:00Z", extra: "ignored" },
            { name: "b.pdf", id: "b1", created_at: "2026-01-02T00:00:00Z", more: "ignored" },
          ],
          error: null,
        })
        .mockResolvedValueOnce({ data: null, error: { message: "list failed" } }),
    });
    mockBuckets({ [BUCKETS.CLIENT_DOCUMENTS]: docsBucket });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const deleteSuccess = await deleteFile("client-1/id/a.pdf", BUCKETS.CLIENT_DOCUMENTS);
    expect(deleteSuccess).toEqual({ success: true, error: null });

    const deleteFailure = await deleteFile("client-1/id/a.pdf", BUCKETS.CLIENT_DOCUMENTS);
    expect(deleteFailure).toEqual({ success: false, error: "delete failed" });

    const listSuccess = await listFiles(BUCKETS.CLIENT_DOCUMENTS, "client-1/id");
    expect(listSuccess).toEqual({
      files: [
        { name: "a.pdf", id: "a1", created_at: "2026-01-01T00:00:00Z" },
        { name: "b.pdf", id: "b1", created_at: "2026-01-02T00:00:00Z" },
      ],
      error: null,
    });

    const listFailure = await listFiles(BUCKETS.CLIENT_DOCUMENTS, "client-1/id");
    expect(listFailure).toEqual({ files: null, error: "list failed" });
    expect(errorSpy).toHaveBeenCalled();
  });
});

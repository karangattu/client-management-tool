import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, createServiceClient, revalidatePath } = vi.hoisted(() => {
  return {
    createClient: vi.fn(),
    createServiceClient: vi.fn(),
    revalidatePath: vi.fn(),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient,
  createServiceClient,
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

import { signEngagementLetter } from "@/app/actions/signature";

function queryChain(terminalValue: { data: unknown; error: unknown } = { data: null, error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn> | unknown> = {};

  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue(terminalValue);
  chain.then = (resolve: (value: { data: unknown; error: unknown }) => unknown) =>
    Promise.resolve(terminalValue).then(resolve);

  return chain as {
    select: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
    then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => Promise<unknown>;
  };
}

describe("signEngagementLetter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    createClient.mockReset();
    createServiceClient.mockReset();
    revalidatePath.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses privileged writes after authorizing the current client session", async () => {
    const clientId = "client-123";
    const currentUserId = "portal-user-123";
    const pdfData = Buffer.from("signed-pdf").toString("base64");
    const signatureDataUrl = "data:image/png;base64,QUJDRA==";

    const sessionAuthorizedClient = queryChain({
      data: { id: clientId, portal_user_id: currentUserId },
      error: null,
    });
    const sessionClientHistory = queryChain({
      data: null,
      error: { message: "new row violates row-level security policy" },
    });

    const sessionFrom = vi.fn((table: string) => {
      if (table === "clients") {
        return sessionAuthorizedClient;
      }
      if (table === "client_history") {
        return sessionClientHistory;
      }
      return queryChain();
    });

    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: currentUserId } },
          error: null,
        }),
      },
      from: sessionFrom,
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ data: { path: "stored/path" }, error: null }),
        }),
      },
    });

    const serviceClientUpdate = queryChain({ data: null, error: null });
    const serviceDocumentInsert = queryChain({ data: null, error: null });
    const serviceHistoryInsert = queryChain({ data: null, error: null });

    createServiceClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "clients") {
          return serviceClientUpdate;
        }
        if (table === "documents") {
          return serviceDocumentInsert;
        }
        if (table === "client_history") {
          return serviceHistoryInsert;
        }
        return queryChain();
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ data: { path: "stored/path" }, error: null }),
        }),
      },
    });

    const result = await signEngagementLetter(clientId, pdfData, signatureDataUrl, "Jane Doe");

    expect(result).toEqual({ success: true });
    expect(serviceClientUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({ engagement_letter_version: "March 2024" })
    );
    expect(serviceDocumentInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: clientId, uploaded_by: currentUserId })
    );
    expect(serviceHistoryInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: clientId, title: "Engagement Letter Signed" })
    );
    expect(sessionClientHistory.insert).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith(`/clients/${clientId}`);
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});
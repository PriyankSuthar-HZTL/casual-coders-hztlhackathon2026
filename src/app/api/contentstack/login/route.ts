import { NextResponse } from "next/server";
import axios from "axios";
import { REGION_HOSTS } from "@/lib/contentstack";
import type { Region } from "@/types";

export const runtime = "nodejs";

interface LoginRequest {
  email: string;
  password: string;
  tfa_token?: string;
  region: Region;
}

interface LoginResponse {
  ok: boolean;
  authToken?: string;
  needsTfa?: boolean;
  tfaType?: string;
  error?: string;
}

export async function POST(request: Request) {
  const { email, password, tfa_token, region } =
    (await request.json()) as LoginRequest;

  if (!email || !password) {
    return NextResponse.json<LoginResponse>(
      { ok: false, error: "Email and password are required." },
      { status: 400 },
    );
  }

  const baseURL = REGION_HOSTS[region] ?? REGION_HOSTS.na;

  const body = {
    user: {
      email,
      password,
      ...(tfa_token ? { tfa_token } : {}),
    },
  };

  try {
    const res = await axios.post(`${baseURL}/v3/user-session`, body, {
      headers: { "Content-Type": "application/json" },
      validateStatus: () => true,
      timeout: 15_000,
    });

    const data = res.data as Record<string, unknown>;

    if (data.error_code === 294) {
      return NextResponse.json<LoginResponse>({
        ok: false,
        needsTfa: true,
        tfaType: data.tfa_type as string | undefined,
        error: (data.error_message as string) ?? "Two-factor authentication required.",
      });
    }

    const user = data.user as Record<string, unknown> | undefined;
    if (!user?.authtoken) {
      return NextResponse.json<LoginResponse>({
        ok: false,
        error:
          (data.error_message as string) ??
          (data.error as string) ??
          "Login failed.",
      });
    }

    return NextResponse.json<LoginResponse>({
      ok: true,
      authToken: user.authtoken as string,
    });
  } catch (err) {
    return NextResponse.json<LoginResponse>(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Network error.",
      },
      { status: 500 },
    );
  }
}

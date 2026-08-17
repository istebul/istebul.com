import {
  createClient,
} from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? "";

const SERVICE_ROLE =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CRON_SECRET =
  Deno.env.get("WAREHOUSE_CYCLE_COUNT_CRON_SECRET") ?? "";

const SECRET_HEADER =
  "x-warehouse-cycle-count-cron-secret";

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function timingSafeEqual(
  left: string,
  right: string,
): boolean {
  const encoder =
    new TextEncoder();

  const a =
    encoder.encode(left);

  const b =
    encoder.encode(right);

  if (a.length !== b.length) {
    return false;
  }

  let difference = 0;

  for (
    let index = 0;
    index < a.length;
    index += 1
  ) {
    difference |=
      a[index] ^ b[index];
  }

  return difference === 0;
}

Deno.serve(
  async (
    request: Request,
  ): Promise<Response> => {
    if (
      request.method === "OPTIONS"
    ) {
      return new Response(
        null,
        {
          status: 204,
          headers: {
            Allow:
              "POST, OPTIONS",
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    if (
      request.method !== "POST"
    ) {
      return jsonResponse(
        {
          ok: false,
          error:
            "method_not_allowed",
        },
        405,
      );
    }

    const incomingSecret =
      request.headers.get(
        SECRET_HEADER,
      ) ?? "";

    if (
      !CRON_SECRET
      || !incomingSecret
      || !timingSafeEqual(
        incomingSecret,
        CRON_SECRET,
      )
    ) {
      return jsonResponse(
        {
          ok: false,
          error:
            "forbidden",
        },
        403,
      );
    }

    if (
      !SUPABASE_URL
      || !SERVICE_ROLE
    ) {
      return jsonResponse(
        {
          ok: false,
          error:
            "scheduler_unconfigured",
        },
        503,
      );
    }

    const supabase =
      createClient(
        SUPABASE_URL,
        SERVICE_ROLE,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        },
      );

    const now =
      new Date().toISOString();

    const {
      data,
      error,
    } =
      await supabase.rpc(
        "warehouse_cycle_count_process_due_schedules",
        {
          p_limit: 25,
          p_now: now,
        },
      );

    if (error) {
      return jsonResponse(
        {
          ok: false,
          error:
            "periodic_runtime_failed",
        },
        500,
      );
    }

    return jsonResponse(
      {
        ok: true,
        at: now,
        runtime: data,
      },
    );
  },
);

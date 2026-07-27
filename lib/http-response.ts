type ResponseJson = Awaited<ReturnType<Response["json"]>>;

export async function readJsonResponse<T = ResponseJson>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json() as Promise<T>;
  }

  // API errors intentionally use JSON bodies for user-facing messages.
  return response.json() as Promise<T>;
}

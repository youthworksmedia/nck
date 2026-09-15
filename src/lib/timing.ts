let timingCounter = 0;

export function startTimer(scope: string, detail?: string) {
  timingCounter += 1;
  const label = detail ? `${scope}:${detail}:${timingCounter}` : `${scope}:${timingCounter}`;
  console.time(label);

  return label;
}

export async function withTiming<T>(
  scope: string,
  detail: string,
  fn: () => Promise<T>
): Promise<T> {
  const label = startTimer(scope, detail);

  try {
    return await fn();
  } finally {
    console.timeEnd(label);
  }
}

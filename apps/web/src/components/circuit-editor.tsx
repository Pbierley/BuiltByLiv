"use client";

import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { normalizeRepTarget, trackingLabel, type CircuitMovement, type TrackingType } from "@/lib/content";
import { cn } from "cn";

const trackingTypes: TrackingType[] = ["weight_reps", "reps", "duration"];

export type MovementDraft = {
  key: string;
  name: string;
  trackingType: TrackingType;
  repsLabel: string;
  targetDuration: string;
};

export function blankMovement(key: string): MovementDraft {
  return {
    key,
    name: "",
    trackingType: "weight_reps",
    repsLabel: "8",
    targetDuration: "45",
  };
}

export function movementsFromExercise(exercise?: { movements?: CircuitMovement[] }) {
  const rows = exercise?.movements ?? [];
  if (rows.length < 2) return [blankMovement("m-1"), blankMovement("m-2")];
  return rows.map((movement) => ({
    key: `m-${movement.position}`,
    name: movement.name,
    trackingType: movement.trackingType,
    repsLabel:
      movement.targetRepsLabel ??
      (movement.targetReps != null ? String(movement.targetReps) : "8"),
    targetDuration: String(movement.targetDurationSeconds ?? 45),
  }));
}

export function circuitPayload(enabled: boolean, drafts: MovementDraft[]) {
  if (!enabled) return { movements: undefined };
  const filled = drafts.filter((draft) => draft.name.trim()).slice(0, 3);
  if (filled.length < 2) return { error: "A circuit needs 2 or 3 movements." };
  const movements: {
    name: string;
    trackingType: TrackingType;
    targetReps?: number;
    targetRepsLabel?: string;
    targetDurationSeconds?: number;
  }[] = [];
  for (const draft of filled) {
    const name = draft.name.trim();
    if (draft.trackingType === "duration") {
      const seconds = Number(draft.targetDuration);
      if (!Number.isFinite(seconds) || seconds < 1) {
        return { error: `Add a time for ${name}.` };
      }
      movements.push({
        name,
        trackingType: draft.trackingType,
        targetDurationSeconds: seconds,
      });
      continue;
    }
    const reps = normalizeRepTarget(draft.repsLabel);
    if ("error" in reps) return { error: reps.error };
    movements.push({
      name,
      trackingType: draft.trackingType,
      targetReps: reps.targetReps,
      targetRepsLabel: reps.targetRepsLabel,
    });
  }
  return { movements };
}

export function CircuitEditor({
  enabled,
  movements,
  onEnabled,
  onChange,
}: {
  enabled: boolean;
  movements: MovementDraft[];
  onEnabled: (enabled: boolean) => void;
  onChange: (movements: MovementDraft[]) => void;
}) {
  return (
    <div className="grid gap-3 border border-border p-3">
      <button
        type="button"
        aria-pressed={enabled}
        onClick={() => onEnabled(!enabled)}
        className={cn(
          "h-11 border text-sm",
          enabled
            ? "border-foreground bg-foreground text-background"
            : "border-border",
        )}
      >
        {enabled ? "Circuit on · up to 3 movements" : "Make this a circuit"}
      </button>
      {enabled ? (
        <div className="grid gap-3">
          {movements.map((movement, index) => (
            <div key={movement.key} className="grid gap-3 border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Movement {index + 1}</p>
                {movements.length > 2 ? (
                  <button
                    type="button"
                    className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                    onClick={() =>
                      onChange(movements.filter((item) => item.key !== movement.key))
                    }
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <Field label="Movement" htmlFor={`${movement.key}-name`}>
                <Input
                  id={`${movement.key}-name`}
                  className="h-11"
                  value={movement.name}
                  onChange={(event) =>
                    onChange(
                      movements.map((item) =>
                        item.key === movement.key
                          ? { ...item, name: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </Field>
              <div className="grid gap-2 sm:grid-cols-3">
                {trackingTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={movement.trackingType === type}
                    onClick={() =>
                      onChange(
                        movements.map((item) =>
                          item.key === movement.key
                            ? { ...item, trackingType: type }
                            : item,
                        ),
                      )
                    }
                    className={cn(
                      "h-11 border text-sm",
                      movement.trackingType === type
                        ? "border-foreground bg-foreground text-background"
                        : "border-border",
                    )}
                  >
                    {trackingLabel(type)}
                  </button>
                ))}
              </div>
              {movement.trackingType === "duration" ? (
                <Field label="Target seconds" htmlFor={`${movement.key}-duration`}>
                  <Input
                    id={`${movement.key}-duration`}
                    className="h-11"
                    inputMode="numeric"
                    value={movement.targetDuration}
                    onChange={(event) =>
                      onChange(
                        movements.map((item) =>
                          item.key === movement.key
                            ? { ...item, targetDuration: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </Field>
              ) : (
                <Field
                  label="Target reps"
                  htmlFor={`${movement.key}-reps`}
                  hint="6-12 or 8-10 each leg"
                >
                  <Input
                    id={`${movement.key}-reps`}
                    className="h-11"
                    maxLength={80}
                    value={movement.repsLabel}
                    onChange={(event) =>
                      onChange(
                        movements.map((item) =>
                          item.key === movement.key
                            ? { ...item, repsLabel: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </Field>
              )}
            </div>
          ))}
          {movements.length < 3 ? (
            <button
              type="button"
              className="h-11 border border-border text-sm"
              onClick={() =>
                onChange([
                  ...movements,
                  blankMovement(`m-${movements.length + 1}-${Date.now()}`),
                ])
              }
            >
              Add movement
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GospelView } from "@/components/gospel-view";
import { adaptDailyGospel } from "@/lib/gospel/get-daily";
import type { DailyGospel } from "@/lib/gospel/types";

const homeRoute = getRouteApi("/");

export default function HomePage() {
  const gospel = homeRoute.useLoaderData();
  const display = useLatinoCopy(gospel);
  return (
    <main className="flex-1 bg-bg text-fg">
      <GospelView gospel={display.gospel} adapting={display.adapting} />
    </main>
  );
}

function useLatinoCopy(gospel: DailyGospel): { gospel: DailyGospel; adapting: boolean } {
  const [adapted, setAdapted] = useState<DailyGospel>(gospel);
  const [adapting, setAdapting] = useState(!gospel.adaptedLatino);

  useEffect(() => {
    setAdapted(gospel);
    if (gospel.adaptedLatino) {
      setAdapting(false);
      return;
    }
    setAdapting(true);
    let cancelled = false;
    void adaptDailyGospel({
      data: { date: gospel.date, edition: gospel.edition },
    }).then((latino) => {
      if (cancelled) return;
      if (!latino) {
        setAdapting(false);
        return;
      }
      setAdapted({
        ...gospel,
        commentTitle: latino.commentTitle || gospel.commentTitle,
        commentary: latino.commentary.length ? latino.commentary : gospel.commentary,
        thoughts: latino.thoughts.length ? latino.thoughts : gospel.thoughts,
        verses:
          gospel.edition === "family" && latino.gospelText
            ? [
                {
                  chapter: gospel.verses[0]?.chapter ?? 0,
                  number: 0,
                  text: latino.gospelText,
                },
              ]
            : gospel.verses,
        adaptedLatino: true,
      });
      setAdapting(false);
    });
    return () => {
      cancelled = true;
    };
  }, [gospel]);

  return { gospel: adapted, adapting };
}

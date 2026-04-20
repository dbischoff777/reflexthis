'use client';

import { useMemo } from 'react';
import { useGameState } from '@/lib/GameContext';
import { t } from '@/lib/i18n';
import { BuildInfo } from '@/components/BuildInfo';

type CreditSection = {
  title: string;
  lines: string[];
};

export function CreditsTab() {
  const { language } = useGameState();

  const year = new Date().getFullYear();

  const sections = useMemo<CreditSection[]>(
    () => [
      {
        title: t(language, 'credits.section.game'),
        lines: [t(language, 'credits.game.title'), t(language, 'credits.game.tagline')],
      },
      {
        title: t(language, 'credits.section.team'),
        lines: [
          t(language, 'credits.team.design'),
          t(language, 'credits.team.engineering'),
          t(language, 'credits.team.art'),
          t(language, 'credits.team.audio'),
          t(language, 'credits.team.qa'),
        ],
      },
      {
        title: t(language, 'credits.section.thanks'),
        lines: [t(language, 'credits.thanks.players'), t(language, 'credits.thanks.community')],
      },
      {
        title: t(language, 'credits.section.legal'),
        lines: [
          `© ${year} ${t(language, 'credits.legal.copyrightHolder')}`,
          t(language, 'credits.legal.trademarks'),
          t(language, 'credits.legal.thirdParty'),
        ],
      },
    ],
    [language, year]
  );

  return (
    <section className="space-y-4">
      <div
        className="border-2 rounded px-4 py-4 sm:px-5 sm:py-5"
        style={{ borderColor: '#3E7CAC', backgroundColor: 'rgba(0, 58, 99, 0.35)' }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
              {t(language, 'credits.title')}
            </h3>
            <p className="text-sm sm:text-base text-foreground/70 mt-1">{t(language, 'credits.subtitle')}</p>
          </div>
          <BuildInfo className="mt-1 sm:mt-0" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sections.map((section) => (
          <div
            key={section.title}
            className="border-2 rounded px-4 py-4"
            style={{ borderColor: '#3E7CAC', backgroundColor: 'rgba(0, 58, 99, 0.5)' }}
          >
            <div className="font-bold text-sm sm:text-base text-foreground mb-2">{section.title}</div>
            <ul className="space-y-1 text-xs sm:text-sm text-foreground/80">
              {section.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}


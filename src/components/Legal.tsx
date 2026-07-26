import React, { useState } from 'react';

interface LegalProps {
  onBack: () => void;
}

type Tab = 'terms' | 'privacy';

const LAST_UPDATED = 'July 2026';

export const Legal: React.FC<LegalProps> = ({ onBack }) => {
  const [tab, setTab] = useState<Tab>('terms');

  return (
    <div className="min-h-[100dvh] bg-dusk-800 dark:bg-dusk-950 text-cream-100 px-4 pt-6 pb-10">
      <header className="flex items-center gap-3 mb-6 max-w-md mx-auto">
        <button
          onClick={onBack}
          aria-label="Back"
          className="w-10 h-10 rounded-full bg-dusk-700/70 border border-cream-100/10 flex items-center justify-center text-xl active:scale-90 transition-transform"
        >
          ←
        </button>
        <h1 className="font-display text-2xl text-marigold-400">Legal</h1>
      </header>

      <div className="max-w-md mx-auto flex flex-col gap-4">
        <div className="flex gap-2 rounded-full bg-dusk-700/40 border border-cream-100/10 p-1">
          <button
            onClick={() => setTab('terms')}
            className={[
              'flex-1 rounded-full font-body text-sm py-2 transition-colors',
              tab === 'terms' ? 'bg-marigold-500 text-dusk-950 font-semibold' : 'text-cream-200/70',
            ].join(' ')}
          >
            Terms of Service
          </button>
          <button
            onClick={() => setTab('privacy')}
            className={[
              'flex-1 rounded-full font-body text-sm py-2 transition-colors',
              tab === 'privacy' ? 'bg-marigold-500 text-dusk-950 font-semibold' : 'text-cream-200/70',
            ].join(' ')}
          >
            Privacy Policy
          </button>
        </div>

        <div className="rounded-2xl bg-dusk-700/40 border border-cream-100/10 p-4 flex flex-col gap-3 font-body text-sm text-cream-200/80 leading-relaxed">
          <p className="font-mono text-[11px] text-cream-200/40">Last updated: {LAST_UPDATED}</p>
          {tab === 'terms' ? <TermsContent /> : <PrivacyContent />}
        </div>

        <p className="font-mono text-[11px] text-cream-200/30 text-center pt-2">
          Bam Baroh — developed by @Mikun190 on Discord
        </p>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <p className="font-display text-marigold-400 text-base mb-1">{title}</p>
    <p>{children}</p>
  </div>
);

const TermsContent: React.FC = () => (
  <>
    <Section title="1. Acceptance">
      By playing Bam Baroh, you agree to these Terms of Service. If you don't agree, please don't use the app.
    </Section>
    <Section title="2. Accounts">
      Creating an account is optional and only required for leaderboards and cross-device stats. You're
      responsible for keeping your login credentials secure and for anything that happens under your account.
    </Section>
    <Section title="3. Acceptable use">
      Don't use bots, exploits, or automated tools to manipulate scores, the leaderboard, or multiplayer rooms.
      Don't harass other players. Room hosts may remove players from their own sessions at any time.
    </Section>
    <Section title="4. Content">
      Game assets, artwork, and code are provided as-is for the purpose of playing Bam Baroh and may not be
      redistributed or resold without permission.
    </Section>
    <Section title="5. Availability">
      Bam Baroh, including multiplayer and leaderboard features, is provided "as is" without warranty of
      uninterrupted availability. Features may change or be discontinued at any time.
    </Section>
    <Section title="6. Limitation of liability">
      The developer isn't liable for any indirect or incidental damages arising from use of the app, to the
      fullest extent permitted by law.
    </Section>
    <Section title="7. Contact">
      Questions about these terms can be sent to the developer, @Mikun190, on Discord.
    </Section>
  </>
);

const PrivacyContent: React.FC = () => (
  <>
    <Section title="1. What we collect">
      If you create an account, we store your username, a securely hashed password, and your in-game stats
      (score, wins, accuracy, rank). If you don't create an account, your progress is saved only on your own
      device via local storage and is never sent to a server.
    </Section>
    <Section title="2. Multiplayer">
      When you join a multiplayer room, your display name and gameplay actions are shared with other players
      in that room in real time so the game can sync between you. This data isn't stored beyond the session
      except for the summary stats used for the leaderboard, if you're logged in.
    </Section>
    <Section title="3. What we don't do">
      We don't sell your data, show ads, or share your information with third parties for marketing purposes.
    </Section>
    <Section title="4. Local storage">
      Settings like volume levels, unlocked levels, and achievement progress are stored locally in your
      browser's storage. Clearing your browser data will reset this progress unless it's tied to a saved
      account.
    </Section>
    <Section title="5. Data deletion">
      To request deletion of your account and associated stats, contact the developer, @Mikun190, on Discord.
    </Section>
    <Section title="6. Changes">
      This policy may be updated as the game evolves. Continued use of the app after changes means you accept
      the updated policy.
    </Section>
  </>
);

import React, { useState } from 'react';
import {
  INTERVIEW_PLAYBOOK,
  KOTLIN_BLUEPRINT_FILES,
} from '../data/seedData';

const ANDROID_PROJECT_TREE = `android/
├── build.gradle.kts
├── settings.gradle.kts
└── app/
    ├── build.gradle.kts
    └── src/
        ├── main/
        │   ├── AndroidManifest.xml
        │   └── java/com/syncledger/fintech/
        │       ├── SyncLedgerApplication.kt
        │       ├── di/
        │       │   └── AppModule.kt
        │       ├── data/
        │       │   ├── local/
        │       │   │   ├── SyncLedgerDatabase.kt
        │       │   │   ├── entity/TransactionEntity.kt
        │       │   │   └── dao/TransactionDao.kt
        │       │   ├── remote/
        │       │   │   └── SyncLedgerApi.kt
        │       │   ├── sync/
        │       │   │   └── SyncWorker.kt
        │       │   └── repository/
        │       │       └── TransactionRepositoryImpl.kt
        │       ├── domain/
        │       │   └── usecase/
        │       │       ├── ResolveConflictUseCase.kt
        │       │       ├── SimplifyGroupDebtsUseCase.kt
        │       │       └── SpendingForecastUseCase.kt
        │       └── presentation/
        │           ├── SyncLedgerViewModel.kt
        │           └── SyncLedgerScreen.kt
        └── test/
            └── java/com/syncledger/fintech/
                └── SyncLedgerUnitTest.kt`;

const GITHUB_REPO_METADATA = {
  repoName: 'syncledger-offline-fintech',
  displayTitle: 'SyncLedger — Offline-First Collaborative Expense & Bill-Splitting Engine',
  shortDescription:
    'Offline-first collaborative expense tracker and bill-splitting engine built with Kotlin, Jetpack Compose, Room (SQLite + SQLCipher AES-256), WorkManager, and Optimistic Concurrency Control (HTTP 409 conflict resolution + O(N log N) graph debt simplification).',
  topics:
    'kotlin, android, jetpack-compose, offline-first, room-database, sqlcipher, workmanager, fintech, clean-architecture, optimistic-concurrency-control, bill-splitting, coroutines-flow',
};

const GITHUB_README_MARKDOWN = `# SyncLedger — Offline-First Collaborative Expense & Bill-Splitting Engine

> **Repository Name:** \`syncledger-offline-fintech\`  
> **Short Description:** Offline-first collaborative expense tracker and bill-splitting engine built with Kotlin, Jetpack Compose, Room (SQLite + SQLCipher AES-256), WorkManager, and Optimistic Concurrency Control (HTTP 409 conflict resolution + O(N log N) graph debt simplification).

---

## 1. Overview & Problem Statement

Standard expense trackers fail when users travel, commute, or split shared household bills in areas with spotty connectivity. **SyncLedger** is an offline-first collaborative financial ledger designed around **Single Source of Truth (SSOT)** local storage, **Optimistic Concurrency Control (OCC)**, and **Graph-Based Smart Debt Simplification**.

Every expense is written immediately to an encrypted local SQLite database (**0ms latency**) using a client-generated **UUID v4** primary key. When internet connectivity is restored, a background **WorkManager** job drains the local outbox queue, reconciles version conflicts deterministically, and broadcasts live peer updates over **WebSockets**.

---

## 2. Visual Walkthrough & Annotated Screenshots

### 2.1 Offline-First Expense Ledger & Outbox Sync Queue
![Offline-First Expense Ledger](public/screenshots/expenses-ledger.png)

- **Single Source of Truth (SSOT):** The UI never reads directly from network responses. It observes \`Flow<List<TransactionEntity>>\` from local SQLite.
- **Client-Generated UUID v4 Primary Keys:** Every new expense generates a 128-bit UUID v4 on the device so offline creations never collide across group members.
- **Outbox Sync State Machine:** Each row tracks its synchronization lifecycle (\`SYNCED\`, \`PENDING_CREATE\`, \`PENDING_UPDATE\`, \`PENDING_DELETE\`, \`CONFLICT\`) and optimistic lock \`version\`.

### 2.2 Optimistic Concurrency Control (HTTP 409 Conflict Resolution)
![Optimistic Concurrency Conflict Resolution](public/screenshots/conflict-resolution.png)

- **Scenario:** Member A and Member B both go offline while viewing Version 1 of *"Hotel Kyoto 4 Nights"* (\`$520.00\`). Member B updates it to \`$600.00\` and reconnects first (Server increments to **Version 2**). Member A updates it to \`$550.00\` and syncs later with \`base_version = 1\`.
- **Detection:** The server detects \`client.version (1) < server.version (2)\` and returns **HTTP 409 Conflict** with the server snapshot attached.
- **Deterministic Resolution:** Users can choose **Keep My Edit (\`LOCAL_WINS\`)**, **Keep Server Version (\`SERVER_WINS\`)**, **Use Most Recent Timestamp (\`LAST_WRITE_WINS\`)**, or **Merge Manually (\`CUSTOM_MERGE\`)** to commit **Version 3**.

### 2.3 Graph-Based Smart Debt Simplification ($O(N \\log N)$)
![Group Balances and Smart Debt Simplification](public/screenshots/group-balances.png)

- **Net Balance Invariant:** Computes each member's net balance ($\text{Net}_i = \text{Total Paid}_i - \text{Total Owed}_i$) where $\sum \text{Net}_i = 0$.
- **Greedy Max-Heap Matching:** Matches the largest debtor with the largest creditor in $O(N \\log N)$ time, collapsing multi-hop chains ($C \\to B \\to A$ becomes $C \\to A$) and reducing 11 raw IOUs down to **3 minimal transfers**.

### 2.4 SQL Categorical Analytics & Monthly Regression Forecast
![Spending Analytics and Monthly Forecast](public/screenshots/spending-forecast.png)

- **Composite Indexed Aggregation:** Queries non-settlement expenses grouped by category using \`idx_transactions_group_updated (group_id, updated_at)\`.
- **Blended Forecast Model:** Combines Daily Burn Rate Projection (50%), Ordinary Least Squares Simple Linear Regression $y = mx + b$ (30%), and 3-Month Weighted Moving Average (20%) to project month-end total vs. budget target.

### 2.5 Native Android Kotlin Source & Clean Architecture
![Android Kotlin Clean Architecture Source](public/screenshots/kotlin-source.png)

- Full native Android source code located under [\`/android/\`](./android) using **Kotlin 2.0**, **Jetpack Compose Material 3**, **Room + SQLCipher (AES-256)**, **WorkManager**, **Dagger-Hilt**, and **Retrofit + OkHttp WebSockets**.`;

interface ScreenshotGuideItem {
  id: string;
  title: string;
  imagePath: string;
  fileRef: string;
  whatItShows: string;
  engineeringDetails: string[];
}

const SCREENSHOT_WALKTHROUGH: ScreenshotGuideItem[] = [
  {
    id: 'shot-ledger',
    title: '01. Offline-First Expense Ledger & Outbox Sync Queue',
    imagePath: '/screenshots/expenses-ledger.png',
    fileRef: 'public/screenshots/expenses-ledger.png',
    whatItShows:
      'Main group expense workspace showing real-time spend totals, outbox sync queue counter, connectivity switch (Online vs. Offline Mode), and per-row optimistic lock versions.',
    engineeringDetails: [
      'Client-Side UUID v4: Every expense generates a globally unique ID locally (e.g., a8f41c02) so offline inserts never collide across devices.',
      'Single Source of Truth (SSOT): The table reads exclusively from local SQLite storage; toggling Offline Mode lets users add, edit, and delete bills with 0ms latency.',
      'Tombstone Soft Deletes: Deleting a synced expense marks it as Pending Delete rather than dropping the row immediately, ensuring background sync notifies the server.',
    ],
  },
  {
    id: 'shot-conflict',
    title: '02. Optimistic Concurrency Control & HTTP 409 Conflict Review',
    imagePath: '/screenshots/conflict-resolution.png',
    fileRef: 'public/screenshots/conflict-resolution.png',
    whatItShows:
      'Side-by-side version comparison when two group members edit the same expense offline (Local v1 at $550.00 vs. Server v2 at $600.00).',
    engineeringDetails: [
      'Version-Checked Updates: Every update sends its base version number. If another member synced an edit first (bumping the server to v2), the server returns HTTP 409 Conflict with the server snapshot.',
      'Deterministic Resolution Strategies: Users can choose Keep My Edit (commits v3), Keep Server Version (keeps v2), Use Most Recent Timestamp (Last-Write-Wins), or Merge Manually.',
    ],
  },
  {
    id: 'shot-balances',
    title: '03. Graph-Based Smart Debt Simplification',
    imagePath: '/screenshots/group-balances.png',
    fileRef: 'public/screenshots/group-balances.png',
    whatItShows:
      'Member standing table (Total Paid vs. Fair Share) and side-by-side comparison of Recommended Simplified Payments (3) vs. Unsimplified Raw Splits (11).',
    engineeringDetails: [
      'Zero-Sum Net Balance Invariant: Computes net position (Paid − Owed) for each member so the sum of all net balances equals $0.00.',
      'Greedy Max-Heap Matching: Matches the largest debtor directly with the largest creditor in O(N log N) time, eliminating pass-through transfers (C -> B -> A becomes C -> A) and cutting total payments by 73%.',
    ],
  },
  {
    id: 'shot-forecast',
    title: '04. SQL Categorical Analytics & Monthly Regression Forecast',
    imagePath: '/screenshots/spending-forecast.png',
    fileRef: 'public/screenshots/spending-forecast.png',
    whatItShows:
      'Category share breakdown and 6-month historical spend chart with a dashed monthly budget target line ($14,000) and blended November projection ($14,212).',
    engineeringDetails: [
      'Indexed SQL Aggregation: Groups non-settlement expenses by category using a composite index on (group_id, updated_at).',
      'On-Device Mathematical Forecasting: Blends current daily burn rate (50%), Ordinary Least Squares linear regression y = mx + b (30%), and 3-month weighted moving average (20%) to warn of budget overruns early.',
    ],
  },
];

export const KotlinBlueprintView: React.FC = () => {
  const [subView, setSubView] = useState<'readme' | 'kotlin'>('readme');
  const [selectedFileId, setSelectedFileId] = useState<string>(
    KOTLIN_BLUEPRINT_FILES[1]?.id ?? KOTLIN_BLUEPRINT_FILES[0].id
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeFile =
    KOTLIN_BLUEPRINT_FILES.find((f) => f.id === selectedFileId) ??
    KOTLIN_BLUEPRINT_FILES[0];

  const handleCopy = (id: string, text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadKotlinBundle = () => {
    const sections = KOTLIN_BLUEPRINT_FILES.map(
      (f) =>
        `# ${f.filename}\nLayer: ${f.layer}\nSummary: ${f.summary}\n\n\`\`\`kotlin\n${f.code}\n\`\`\`\n`
    ).join('\n---\n\n');

    const fullContent = `# SyncLedger — Production Android (Kotlin + Jetpack Compose + Room + SQLCipher + WorkManager)\n\n## Project File Tree\n\`\`\`\n${ANDROID_PROJECT_TREE}\n\`\`\`\n\n---\n\n${sections}`;
    handleDownloadFile('SyncLedger-Android-Kotlin-Source.md', fullContent);
  };

  return (
    <div className="space-y-8">
      {/* Header & Mode Switcher */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-black">
        <div className="space-y-1 max-w-3xl">
          <h1 className="text-xl font-bold tracking-tight text-black">
            GitHub Repository Setup, README &amp; Android Kotlin Source
          </h1>
          <p className="text-xs text-neutral-600">
            Ready-to-copy GitHub repository name, description, topics, full{' '}
            <span className="font-mono-tabular">/README.md</span> with
            annotated screenshots, and native Android Kotlin source files (
            <span className="font-mono-tabular">/android/</span>).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center p-1 bg-neutral-100 border border-black">
            <button
              type="button"
              onClick={() => setSubView('readme')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                subView === 'readme'
                  ? 'bg-black text-white'
                  : 'text-neutral-700 hover:text-black'
              }`}
            >
              GitHub README &amp; Screenshots
            </button>
            <button
              type="button"
              onClick={() => setSubView('kotlin')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                subView === 'kotlin'
                  ? 'bg-black text-white'
                  : 'text-neutral-700 hover:text-black'
              }`}
            >
              Android Kotlin Files ({KOTLIN_BLUEPRINT_FILES.length})
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadKotlinBundle}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-black hover:bg-neutral-800 transition-colors whitespace-nowrap"
          >
            Download Kotlin Bundle (.md)
          </button>
        </div>
      </section>

      {subView === 'readme' ? (
        <div className="space-y-8">
          {/* GitHub Repository Name, About Description & Topics Quick-Copy Box */}
          <section
            aria-label="GitHub Repository Name and Description"
            className="border border-black bg-white p-6 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-black">
              <div>
                <h2 className="text-base font-bold text-black">
                  GitHub Repository Name &amp; Description (Ready to Paste)
                </h2>
                <p className="text-xs text-neutral-600">
                  Use these exact details when creating your GitHub repository
                  and filling out the &ldquo;About&rdquo; sidebar.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    handleCopy('readme-md', GITHUB_README_MARKDOWN)
                  }
                  className="px-3 py-1.5 text-xs font-semibold text-black bg-white border border-black hover:bg-black hover:text-white transition-colors whitespace-nowrap"
                >
                  {copiedId === 'readme-md'
                    ? 'Copied README.md'
                    : 'Copy README.md'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleDownloadFile('README.md', GITHUB_README_MARKDOWN)
                  }
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-black hover:bg-neutral-800 transition-colors whitespace-nowrap"
                >
                  Download README.md
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Repo Name */}
              <div className="border border-black p-4 bg-neutral-50 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="text-[11px] font-mono-tabular font-semibold uppercase text-neutral-600">
                    Repository Name
                  </div>
                  <div className="text-sm font-mono-tabular font-bold text-black break-all">
                    {GITHUB_REPO_METADATA.repoName}
                  </div>
                  <div className="text-xs text-neutral-600 pt-1">
                    Alt: <span className="font-mono-tabular">SyncLedger</span> or{' '}
                    <span className="font-mono-tabular">
                      splitpulse-offline-engine
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy('repo-name', GITHUB_REPO_METADATA.repoName)
                  }
                  className="self-start px-2.5 py-1 text-xs font-semibold text-black bg-white border border-black hover:bg-black hover:text-white transition-colors"
                >
                  {copiedId === 'repo-name' ? 'Copied Name' : 'Copy Repo Name'}
                </button>
              </div>

              {/* Short Description (About) */}
              <div className="border border-black p-4 bg-white flex flex-col justify-between space-y-3 md:col-span-2">
                <div className="space-y-1">
                  <div className="text-[11px] font-mono-tabular font-semibold uppercase text-neutral-600">
                    GitHub &ldquo;About&rdquo; Short Description
                  </div>
                  <p className="text-xs text-black leading-relaxed">
                    {GITHUB_REPO_METADATA.shortDescription}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-200">
                  <div className="text-[11px] font-mono-tabular text-neutral-600 truncate max-w-xl">
                    Topics: {GITHUB_REPO_METADATA.topics}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          'repo-desc',
                          GITHUB_REPO_METADATA.shortDescription
                        )
                      }
                      className="px-2.5 py-1 text-xs font-semibold text-black bg-white border border-black hover:bg-black hover:text-white transition-colors"
                    >
                      {copiedId === 'repo-desc'
                        ? 'Copied Description'
                        : 'Copy Description'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy('repo-topics', GITHUB_REPO_METADATA.topics)
                      }
                      className="px-2.5 py-1 text-xs font-semibold text-black bg-white border border-black hover:bg-black hover:text-white transition-colors"
                    >
                      {copiedId === 'repo-topics'
                        ? 'Copied Topics'
                        : 'Copy Topics'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* System Architecture Flow */}
          <section className="border border-black bg-white p-6 space-y-4">
            <div className="pb-3 border-b border-neutral-300">
              <h2 className="text-base font-bold text-black">
                Offline-First Architecture Pipeline (Documented in /README.md)
              </h2>
              <p className="text-xs text-neutral-600">
                How data flows from local SQLite storage through background
                synchronization and optimistic conflict resolution.
              </p>
            </div>

            {/* Data Flow Pipeline */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs pt-1">
              <div className="border border-black p-4 bg-white">
                <div className="font-mono-tabular font-bold text-black">
                  1. UI Layer
                </div>
                <p className="mt-1 text-neutral-600">
                  Jetpack Compose / React UI observes reactive state from local
                  storage with 0ms offline latency.
                </p>
              </div>
              <div className="border border-black p-4 bg-neutral-50">
                <div className="font-mono-tabular font-bold text-black">
                  2. Local SQLite (SSOT)
                </div>
                <p className="mt-1 text-neutral-600">
                  Encrypted via SQLCipher AES-256. Generates client UUID v4 and
                  tracks <span className="font-mono-tabular">sync_status</span>.
                </p>
              </div>
              <div className="border border-black p-4 bg-white">
                <div className="font-mono-tabular font-bold text-black">
                  3. Outbox SyncWorker
                </div>
                <p className="mt-1 text-neutral-600">
                  WorkManager queues offline creates, updates, and soft-delete
                  tombstones until connectivity returns.
                </p>
              </div>
              <div className="border border-black p-4 bg-neutral-50">
                <div className="font-mono-tabular font-bold text-black">
                  4. Optimistic Locking
                </div>
                <p className="mt-1 text-neutral-600">
                  Verifies record <span className="font-mono-tabular">version</span>.
                  Flags concurrent offline edits with HTTP 409 Conflict.
                </p>
              </div>
              <div className="border border-black p-4 bg-white">
                <div className="font-mono-tabular font-bold text-black">
                  5. Live WebSockets
                </div>
                <p className="mt-1 text-neutral-600">
                  Shared group expenses arrive in real time and upsert directly
                  into local SQLite.
                </p>
              </div>
            </div>
          </section>

          {/* Detailed Screenshot Walkthrough Section */}
          <section
            aria-label="Screenshot Walkthrough and Explanations"
            className="space-y-6"
          >
            <h2 className="text-base font-bold text-black">
              Annotated Screenshot Walkthrough (Included in /README.md)
            </h2>

            <div className="grid grid-cols-1 gap-6">
              {SCREENSHOT_WALKTHROUGH.map((shot) => (
                <article
                  key={shot.id}
                  className="border border-black bg-white p-6 space-y-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-300">
                    <h3 className="text-base font-bold text-black">
                      {shot.title}
                    </h3>
                    <span className="text-xs font-mono-tabular text-neutral-600">
                      {shot.fileRef}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Screenshot Image with Resilient Fallback */}
                    <div className="lg:col-span-7 border border-black bg-neutral-100 overflow-hidden">
                      <img
                        src={shot.imagePath}
                        alt={shot.title}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                        className="w-full h-auto block"
                      />
                    </div>

                    {/* Detailed Explanation */}
                    <div className="lg:col-span-5 space-y-4">
                      <div>
                        <div className="text-xs font-bold text-black">
                          What This Screen Shows
                        </div>
                        <p className="mt-1 text-xs text-neutral-700 leading-relaxed">
                          {shot.whatItShows}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-bold text-black">
                          How It Works Under the Hood
                        </div>
                        <ul className="space-y-2 text-xs text-neutral-700">
                          {shot.engineeringDetails.map((detail, i) => (
                            <li
                              key={i}
                              className="p-2.5 bg-neutral-50 border border-neutral-300 leading-relaxed"
                            >
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Interview Defense & Resume Impact Statements */}
          <section aria-label="Technical Interview Guide" className="space-y-4">
            <h2 className="text-base font-bold text-black">
              Technical Interview Defense &amp; Resume Bullet Points
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {INTERVIEW_PLAYBOOK.map((item, idx) => (
                <div
                  key={item.topic}
                  className="border border-black bg-white p-6 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="text-xs font-mono-tabular font-semibold text-neutral-600">
                      0{idx + 1} · {item.topic}
                    </div>
                    <h3 className="text-sm font-bold text-black">
                      Q: &ldquo;{item.question}&rdquo;
                    </h3>
                    <p className="text-xs text-neutral-700 leading-relaxed">
                      <strong className="text-black">Answer:</strong>{' '}
                      {item.answer}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-neutral-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono-tabular font-semibold text-black">
                        RESUME IMPACT STATEMENT
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(`cv-${idx}`, item.resumeBullet)
                        }
                        className="text-xs underline text-black hover:text-neutral-600"
                      >
                        {copiedId === `cv-${idx}` ? 'Copied' : 'Copy Bullet'}
                      </button>
                    </div>
                    <p className="text-xs italic text-neutral-800 bg-neutral-50 p-3 border border-neutral-300">
                      &ldquo;{item.resumeBullet}&rdquo;
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        /* Kotlin Source Explorer View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <section
            aria-label="Android Studio Project Tree"
            className="border border-black bg-white p-5 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="pb-3 border-b border-black flex items-center justify-between">
                <h2 className="text-sm font-bold text-black">
                  Android Studio Project Tree
                </h2>
                <span className="text-xs font-mono-tabular text-neutral-600">
                  Kotlin 2.0 · API 35
                </span>
              </div>

              <pre className="p-3 text-[10.5px] font-mono-tabular bg-neutral-50 border border-neutral-300 text-black overflow-x-auto leading-relaxed">
                <code>{ANDROID_PROJECT_TREE}</code>
              </pre>
            </div>

            <div className="pt-3 border-t border-neutral-200 text-xs text-neutral-600">
              All files above are located in the repository under{' '}
              <span className="font-mono-tabular text-black">/android/</span>{' '}
              for direct import into Android Studio.
            </div>
          </section>

          <section
            aria-label="Kotlin Production Source Code"
            className="lg:col-span-2 border border-black bg-white flex flex-col justify-between overflow-hidden"
          >
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-b border-black bg-neutral-100">
                <div className="flex flex-wrap items-center gap-1.5">
                  {KOTLIN_BLUEPRINT_FILES.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => setSelectedFileId(file.id)}
                      className={`px-2.5 py-1.5 text-xs font-mono-tabular font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        selectedFileId === file.id
                          ? 'bg-black text-white'
                          : 'bg-white text-black border border-neutral-300 hover:border-black'
                      }`}
                    >
                      {file.filename.split('/').pop()}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(activeFile.id, activeFile.code)}
                  className="px-3 py-1.5 text-xs font-semibold text-black bg-white border border-black hover:bg-black hover:text-white transition-colors whitespace-nowrap shrink-0"
                >
                  {copiedId === activeFile.id
                    ? 'Copied to Clipboard'
                    : 'Copy Kotlin File'}
                </button>
              </div>

              <div className="p-5 border-b border-neutral-200 bg-white space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-mono-tabular font-bold text-black break-all">
                    {activeFile.filename}
                  </span>
                  <span className="text-xs font-mono-tabular font-semibold text-neutral-700">
                    {activeFile.layer}
                  </span>
                </div>
                <p className="text-xs text-neutral-600">
                  {activeFile.summary}
                </p>
              </div>

              <pre className="p-5 text-xs font-mono-tabular bg-black text-white overflow-x-auto leading-relaxed max-h-[500px]">
                <code>{activeFile.code}</code>
              </pre>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

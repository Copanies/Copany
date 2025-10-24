<div align="center">
<picture>
  <source media="(max-width: 520px)" srcset="https://github.com/Copanies/Copany/blob/main/copany_icon_stroke.png?raw=true" width="168">
  <img src="https://github.com/Copanies/Copany/blob/main/copany_icon_stroke.png?raw=true" width="256">
</picture>
</div>

<h1 align="center">Copany</h1>

<p align="center">
    <strong>Together, we are free.</strong><br>
    <span>English</span>
    <a href="https://github.com/Copanies/Copany/blob/main/README_zh.md">中文</a>
</p>

## Background

Today, there are generally two ways to start a career:
either found a company or join one.

Companies organize people through salary systems, enabling them to achieve great things that individuals couldn’t accomplish alone — while providing relatively stable income.
However, this seemingly mature model of collaboration, while efficient and structured, also brings several long-standing challenges:

1. **High cost of joining or leaving a team**
   Changing teams or pursuing a new direction comes with significant cost — going through interviews, giving up bonuses, and risking that the next job might be even worse.

2. **Lack of meaning in daily work**
   Because we work for others, not for our own ventures, many tasks exist not for real product needs or personal belief, but to satisfy managerial decisions, processes, or performance metrics.

3. **Income stops when you leave**
   Our income comes from selling time. Once we stop working, the income stops as well.
   Since the long-term value of the product doesn’t belong to us, we have no connection to its future gains after leaving the company.

4. **High operational cost and management burden**
   For companies, finding the right people is time-consuming and expensive.
   After hiring, they must invest even more effort into “managing” and “motivating” employees — approaches that often prove inefficient or counterproductive.

## Introduction

Copany aims to create a new way of collaboration — one that is free, transparent, and outcome-driven.

In Copany:

1. **Anyone can start or join a project**
   No interviews, no entry barriers. Join or leave anytime — collaboration is entirely free.

2. **Project income is distributed by contribution points**
   The projects you participate in always remain partially yours.
   Even after leaving, you continue to share in their future earnings.

3. **Contribution points are based on task complexity**
   Each completed task that meets the standard earns contribution points according to its complexity.

4. **More contribution types coming soon**
   Beyond completed tasks, Copany will support contributions such as funding or material support in the future.

#### Why measure contributions by “task complexity”?

Let’s ask a simple question:
**What do you truly contribute to a project?**
The answer is — **your time and experience.**

In traditional companies, the pay system is essentially working hours × experience-based rate. But in Copany, we don’t limit your working time or evaluate you through interviews, so this model doesn’t apply.

Instead, we measure your results — the tasks you’ve completed — which represent the product of your time and experience. Since the time required for a task strongly correlates with its complexity, “task complexity” serves as a fair basis for measuring contribution.

> In Copany, only tasks that meet predefined quality standards are counted as valid contributions. Whether a task meets the standard depends on the contributor’s experience and ability, meaning that experience is already indirectly reflected in the system. This allows Copany to fairly assess contributions through a single dimension — task complexity.

For exceptional work that goes beyond the standard, Copany plans to introduce an additional reward mechanism in the future.

#### How task complexity is determined

In practice, Copany currently follows this process:

1. Task owners provide an initial complexity estimate before starting;

2. Team members can discuss and adjust it during execution;

3. Project leads review and finalize complexity levels after completion;

4. All records are public, allowing everyone to review, comment, and help refine the shared understanding of complexity.

Through continuous iteration and feedback, Copany aims to build a system that truly reflects each individual’s value and contribution to a project.

## Mission & Vision

**Mission:**
To create a collaborative system that is free, transparent, and shares outcomes fairly.

**Vision:**
To make work more free — and more meaningful.

## Product Structure

- **Explore Page**
  Browse all Copany projects, track progress, and discover how to participate.

- **Profile Page**
  Manage your account, configure payout methods, and view income records.

- **Project Page**
  Each project consists of four core sections:

  - **Discussion** — Share ideas, discuss directions, and exchange insights.

  - **Collaboration** — Plan project tasks, assign owners, define complexity, and prioritize execution.

  - **Contribution** — Record all completed tasks and their corresponding contribution points.

  - **Finance** — Display project income and expenses, and distribute profits proportionally.

## Tech Stack

- **Frontend:** Next.js 15.3.3
  - UI Framework: React 19.0.0
  - Styling: Tailwind CSS 4
  - State Management: React Query
  - Markdown Editor: Milkdown
  - Data Visualization: Visx
- **Backend & Database:** Supabase
  - Development Tool: Supabase CLI
  - Authentication: Supabase Auth
  - Database Language: PostgreSQL
- **Programming Language:** TypeScript 5
- **Code Quality:** ESLint + Next.js Config
- **Integrations:**
  - GitHub API (Octokit)
  - Google OAuth
  - Figma API
- **Deployment:** Google Cloud Run
  - Containerization: Docker
  - Build: Node.js 23 Alpine

## Quick Start

- Development guidelines: [CONTRIBUTING.md](https://github.com/Copanies/Copany/blob/main/contributing.md/)
- Product design prototype: [Figma Design](https://www.figma.com/design/B5wmCOR2kV9pKCZiq6fDMS/Copany?node-id=2809-4074&t=kkuuZDL8rl0pVeKU-1)

## How to Contribute

1. **Create and Complete a Task (Issue)**

   1. **Start a discussion:**

      Before creating an Issue, open a discussion to align with others on ideas and direction.

   2. **Create an Issue:**

      Once agreed, create one or more Issues, assign an owner, and set a complexity level.

   3. **Submit for Review:**

      When done, change the Issue status to In Review for quality and complexity evaluation.

   4. **Mark as Done:**

      After approval, change the status to Done. The result (code, design, etc.) will be merged, and contribution points granted accordingly.

2. **Claim and Complete an Existing Task**
   1. Browse available Issues in the Collaboration section, reviewing details and complexity levels.
   2. Assign yourself as the Assignee.
   3. After review by the project lead or Issue creator, begin execution.
   4. Follow the same review and completion process as above.

## Profit Distribution Mechanism

1. **Set up your payment method:**
   Go to the Profile Page and choose your payout channel. Supported methods:

   - Alipay
   - Wise

   Upload your payment code to complete setup.

2. **Monthly distribution records:**

   Every month on the 10th (UTC 00:00), the system automatically calculates:

   - Total project revenue and expenses from the previous cycle (10th → 10th);

   - Each contributor’s share ratio at 00:00 on the 1st of that month.

   A new distribution record is then generated.

3. **Project lead payout:**

   The project lead transfers payments based on the record and contributor preferences, and uploads the transaction proof.

4. **Contributor confirmation:**

   Contributors receive a notification to confirm receipt.

   Once confirmed, the profit distribution is finalized.

## License

This project is licensed under the
[Copany Open Collaboration License (COSL)](https://github.com/Copanies/Copany/blob/main/LICENSE)

## Legal Disclaimer

- This project and all contributions are provided “as is,” without any warranty of function or availability.

- By submitting contributions, you agree to comply with the Copany Open Collaboration License (COSL) and its profit-sharing terms.

- In case of violations, contributors reserve the right to pursue enforcement and protect their interests.

## Join the Community

Have questions or suggestions? Join the discussion or start contributing today!

- Discussion: [Copany Discussion](https://copany.app/copany/5?tab=Discussion)

- Collaboration: [Copany Collaboration](https://copany.app/copany/5?tab=Cooperate)

- Discord: [Discord Sever](https://discord.gg/fWPx5dJRHQ)

- Learn more: [Explore Copany](https://copany.app)

- Contact: jinhongw982@gmail.com

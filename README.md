<h1 align="center">Copany</h1>

<p align="center">
    <strong>Together, we are free.</strong><br>
    <span>English</span>
    <a href="https://github.com/Copanies/Copany/blob/main/README_zh.md">中文</a>
</p>

## Background

Today, there are generally two ways to start a career:
Either found a company, or join one.

A company organizes people through its salary system to accomplish great things that individuals couldn’t achieve alone, while providing members with relatively stable income.
However, this seemingly efficient and mature structure comes with several long-standing issues that limit both freedom and meaning at work:

1. **Lack of Freedom in Collaboration**
   In most companies, everything is prearranged — what you do and who you work with.
   Switching teams or exploring a new direction often requires lengthy interviews, sacrificing bonuses, and taking the risk that the next job might be worse.

2. **Meaningless Work**
   Many tasks exist not because of real product needs or personal belief, but due to managerial decisions, processes, or performance metrics.
   The root cause is simple: we don’t own the products we create.
   As a result, we’re not truly accountable to the product itself — we’re accountable to “the job,” to “the process,” and to “the evaluation.”
   For those who seek meaning in their work, this can be deeply frustrating.

3. **Income Tied to Time**
   Our income comes from selling time. Once we stop working, the income stops as well.
   Because we don’t own the long-term value of what we create, we lose all connection to a product’s future success once we leave the company.

4. **High Costs and Managerial Friction**
   For companies, hiring the right people is both difficult and expensive, requiring extensive screening and interviews.
   After onboarding, companies must invest even more effort into “managing” and “motivating” employees — methods that often prove inefficient or counterproductive.

## Introduction

Copany aims to provide a new way of addressing these problems.
It may not be a perfect solution, but through collective exploration, we hope to build a system of collaboration that is freer, more efficient, and fairer than the traditional company model.

In Copany:

1. **Anyone can start or join a project**
   No interviews, no barriers — you can join or leave at any time. Collaboration is entirely free and open.

2. **Project profits are distributed by contribution points**
   Each project’s revenue is divided based on each member’s contribution ratio, represented by contribution points that never expire.
   This means part of the project’s value always belongs to you — even after you leave.
   Because “the results belong to yourself,” people naturally focus on work that truly matters.

3. **Contribution points are based on task complexity**
   Each completed task that meets the defined standard grants contribution points proportional to its complexity.
   Deliverables that exceed expectations can earn additional rewards.

4. **More forms of contribution will be supported in the future**
   Beyond task completion, Copany will support contributions such as financial or material support — all converted into corresponding contribution points.

#### Why Measure Contribution by “Task Complexity”?

Let’s ask a simple question:
**What is the essence of your contribution to a project?**
The answer: time and experience/knowledge.

In traditional companies, salaries are essentially calculated as
“working time × experience-matched hourly rate.”
But in Copany, we don’t restrict working hours, nor do we evaluate experience through interviews — so this model doesn’t apply.

Instead, we measure results — the outcomes produced by your time and experience.
Since the time required for a task correlates strongly with its complexity, task complexity becomes a fair and transparent measure of contribution.

In Copany, only deliverables that meet the predefined quality standards are accepted and counted toward contribution points.
Because the time and skill required to meet the standard inherently reflect the contributor’s experience, experience is indirectly incorporated into the system.
This allows Copany to fairly evaluate contributions using a single metric — task complexity.

For exceptional work that exceeds expectations, Copany plans to introduce an additional reward mechanism in the future.

#### Complexity Evaluation Mechanism

In practice, Copany currently follows this evaluation process:

1. Task owners provide an initial estimate of task complexity before work begins.

2. Team members may discuss and adjust the rating during execution.

3. Project leads perform a final review of both results and complexity ratings upon completion.

4. All records are public and transparent, open to discussion and iteration, helping the community reach a shared understanding of task complexity.

Through continuous feedback and refinement, Copany aims to establish a system that truly reflects both personal value and collective contribution.

## Mission & Vision

**Mission:**

To create a collaborative model that is free, transparent, and built on shared outcomes.

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
Copany Open Collaboration License (COSL)

## Legal Disclaimer

- This project and all contributions are provided “as is,” without any warranty of function or availability.
- By submitting contributions, you agree to comply with the Copany Open Collaboration License (COSL) and its profit-sharing terms.
- In case of violations, contributors reserve the right to pursue enforcement and protect their interests.

## Join the Community

Have questions or suggestions? Join the discussion or start contributing today!

- Discussion: [Copany Discussion](https://copany.app/copany/5?tab=Discussion)
- Collaboration: [Copany Collaboration](https://copany.app/copany/5?tab=Cooperate)
- Telegram: [Copany Group](https://t.me/+FMfZz5wKKAAzNmI1)
- Learn more: [Explore Copany](https://copany.app)
- Contact: support@copany.app

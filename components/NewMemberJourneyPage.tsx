import React from 'react';
import { EditableKnowledgePage } from './common/EditableKnowledgePage';

const DEFAULT_CONTENT = `
<p style="color: rgb(55, 65, 81); margin-bottom: 0.5rem; line-height: 1.625;">
  <em>Professionally Speaking Toastmasters Club 3091</em>
</p>

<p style="color: rgb(55, 65, 81); margin-bottom: 1.5rem; line-height: 1.625;">
  Congratulations on becoming an official member of <strong>Professionally Speaking Toastmasters 3091!</strong><br />
  You've just joined a club built on professionalism, consistency, and personal growth. From this moment on, you'll begin your journey through speaking, listening, and leadership — guided by our <strong>Standard Operating Procedures (SOP)</strong>, your <strong>mentor</strong>, and our dedicated <strong>officers</strong>.
</p>

<p style="color: rgb(55, 65, 81); margin-bottom: 2rem; line-height: 1.625;">
  Every meeting follows a precise, professional format so that whether it's your first or hundredth meeting, you know exactly what to expect.<br />
  Let's walk through your first year — step by step.
</p>

<hr style="margin: 2rem 0; border-color: rgb(229, 231, 235);" />

<h2 style="font-size: 1.5rem; font-weight: bold; color: rgb(17, 24, 39); margin-bottom: 1rem;">
  🌟 Week 1 – Orientation and Welcome
</h2>

<p style="color: rgb(55, 65, 81); margin-bottom: 1rem; line-height: 1.625;">
  After your induction by the <strong>President</strong>, your journey officially begins. You'll meet your <strong>mentor</strong>, who will help you navigate the first few months and answer any questions you have about meetings, roles, or Pathways.
</p>

<p style="color: rgb(55, 65, 81); margin-bottom: 1rem; line-height: 1.625;">
  During this week, the following steps take place:
</p>

<ul style="list-style-type: disc; padding-left: 2rem; margin-bottom: 1rem; color: rgb(55, 65, 81);">
  <li style="margin-bottom: 0.5rem;">The <strong>VP of Education (VPE)</strong> adds you to the club schedule and the mentorship process.</li>
  <li style="margin-bottom: 0.5rem;">The <strong>Webmaster</strong> updates your information on the club site.</li>
  <li style="margin-bottom: 0.5rem;">The <strong>VP of Membership (VPM)</strong> ensures your nameplate has been ordered.</li>
  <li style="margin-bottom: 0.5rem;">You receive access to the club's <strong>Functionary Roles and SOP guide</strong>, along with an introduction to <strong>Pathways</strong> — Toastmasters International's educational program.</li>
</ul>

<p style="color: rgb(55, 65, 81); margin-bottom: 2rem; line-height: 1.625;">
  You are now part of our professional rotation and will soon appear on upcoming meeting agendas.
</p>

<hr style="margin: 2rem 0; border-color: rgb(229, 231, 235);" />

<h2 style="font-size: 1.5rem; font-weight: bold; color: rgb(17, 24, 39); margin-bottom: 1rem;">
  🧩 Weeks 2–4 – Preparing for Your Ice Breaker
</h2>

<p style="color: rgb(55, 65, 81); margin-bottom: 1rem; line-height: 1.625;">
  Your first major milestone is your <strong>Ice Breaker speech</strong> — your introduction to the club and your first Pathways project.<br />
  This is where you tell us who you are, what brought you here, and what you hope to achieve through Toastmasters.
</p>

<h3 style="font-size: 1.25rem; font-weight: 600; color: rgb(17, 24, 39); margin-top: 1.5rem; margin-bottom: 0.75rem;">
  Your Steps:
</h3>
<ol style="list-style-type: decimal; padding-left: 2rem; margin-bottom: 1rem; color: rgb(55, 65, 81);">
  <li style="margin-bottom: 0.5rem;"><strong>Log into Pathways:</strong> Visit Toastmasters International's website and select your chosen Path.</li>
  <li style="margin-bottom: 0.5rem;"><strong>Locate the "Ice Breaker" Project:</strong> This is your first assignment in Pathways.</li>
  <li style="margin-bottom: 0.5rem;"><strong>Coordinate with your mentor:</strong> Work together to plan and practice your speech.</li>
  <li style="margin-bottom: 0.5rem;"><strong>Rehearse:</strong> Practice several times out loud to stay within the 4–6 minute timeframe.</li>
  <li style="margin-bottom: 0.5rem;"><strong>Send details to the Toastmaster:</strong> Provide your speech title, timing, and a short introduction.</li>
</ol>

<div style="background-color: rgb(239, 246, 255); border-left: 4px solid rgb(59, 130, 246); padding: 1rem; margin: 1.5rem 0;">
  <p style="color: rgb(55, 65, 81); line-height: 1.625; font-style: italic;">
    <strong>"Every speaker is a role model. Club members learn by observing one another. Growth comes through consistent practice and constructive evaluation—this is the essence of Toastmasters."</strong>
  </p>
</div>

<hr style="margin: 2rem 0; border-color: rgb(229, 231, 235);" />

<h2 style="font-size: 1.5rem; font-weight: bold; color: rgb(17, 24, 39); margin-bottom: 1rem;">
  🎙️ Month 2–3 – Taking on Your First Roles
</h2>

<p style="color: rgb(55, 65, 81); margin-bottom: 1rem; line-height: 1.625;">
  After your Ice Breaker, you'll start learning the flow of our meetings by serving in supporting roles — called <strong>Functionary Roles</strong>.
</p>

<ul style="list-style-type: disc; padding-left: 2rem; margin-bottom: 1rem; color: rgb(55, 65, 81);">
  <li style="margin-bottom: 0.5rem;"><strong>Timer:</strong> Helps speakers stay within time and reports results.</li>
  <li style="margin-bottom: 0.5rem;"><strong>Ah Counter:</strong> Notes filler words to help members improve clarity.</li>
  <li style="margin-bottom: 0.5rem;"><strong>Ballot Counter:</strong> Tallies votes and presents awards.</li>
</ul>

<hr style="margin: 2rem 0; border-color: rgb(229, 231, 235);" />

<h2 style="font-size: 1.5rem; font-weight: bold; color: rgb(17, 24, 39); margin-bottom: 1rem;">
  🏗️ Month 4–6 – Developing as a Speaker
</h2>

<p style="color: rgb(55, 65, 81); margin-bottom: 1rem; line-height: 1.625;">
  Continue your Pathways projects and begin serving in mid-level roles:
</p>

<ul style="list-style-type: disc; padding-left: 2rem; margin-bottom: 1rem; color: rgb(55, 65, 81);">
  <li style="margin-bottom: 0.5rem;"><strong>Grammarian:</strong> Introduces a Word of the Day and tracks language use.</li>
  <li style="margin-bottom: 0.5rem;"><strong>Table Topics Master:</strong> Leads the impromptu speaking segment.</li>
  <li style="margin-bottom: 0.5rem;"><strong>Evaluator:</strong> Provides structured feedback for another speaker.</li>
</ul>

<hr style="margin: 2rem 0; border-color: rgb(229, 231, 235);" />

<h2 style="font-size: 1.5rem; font-weight: bold; color: rgb(17, 24, 39); margin-bottom: 1rem;">
  🪶 Month 7–9 – Leading the Meeting
</h2>

<p style="color: rgb(55, 65, 81); margin-bottom: 1rem; line-height: 1.625;">
  Step into the leadership spotlight as the <strong>Duty Toastmaster</strong> — the emcee and host of the entire meeting.
</p>

<hr style="margin: 2rem 0; border-color: rgb(229, 231, 235);" />

<h2 style="font-size: 1.5rem; font-weight: bold; color: rgb(17, 24, 39); margin-bottom: 1rem;">
  🏆 Month 10–12 – Confidence, Mentorship, and Leadership
</h2>

<p style="color: rgb(55, 65, 81); margin-bottom: 1rem; line-height: 1.625;">
  By the end of your first year, you'll have delivered multiple speeches, served in every role, and learned to lead and inspire others.
</p>

<hr style="margin: 2rem 0; border-color: rgb(229, 231, 235);" />

<h2 style="font-size: 1.5rem; font-weight: bold; color: rgb(17, 24, 39); margin-bottom: 1rem;">
  💬 In Summary
</h2>

<p style="color: rgb(55, 65, 81); margin-bottom: 1rem; line-height: 1.625;">
  Your first year is about learning, practicing, and supporting others. Each role you take builds your confidence and leadership. With every speech, you're helping uphold the professionalism that defines <strong>Professionally Speaking Toastmasters 3091</strong>.
</p>
`;

export const NewMemberJourneyPage: React.FC = () => {
  return (
    <EditableKnowledgePage
      pageId="new-member-journey"
      pageTitle="🧭 Your Journey as a New Member"
      defaultContent={DEFAULT_CONTENT}
    />
  );
};

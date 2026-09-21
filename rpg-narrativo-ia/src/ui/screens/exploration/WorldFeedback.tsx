import { feedbackClassName, feedbackIcon, type WorldFeedbackView } from '../../sandbox';

export function WorldFeedback({ feedback }: { feedback: WorldFeedbackView }) {
  return (
    <section
      className={feedbackClassName(feedback.kind)}
      role="status"
      aria-live="polite"
    >
      <span className="world-feedback__icon" aria-hidden="true">{feedbackIcon(feedback.kind)}</span>
      <div>
        <strong>{feedback.title}</strong>
        <p>{feedback.message}</p>
      </div>
    </section>
  );
}

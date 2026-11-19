import { useState } from "react";
import { Sparkles, MessageCircle, ArrowRight } from "lucide-react";
import { api } from "../api";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { DISCLAIMER } from "../constants";

export function Assistant({
  data,
  refresh,
}: {
  data: any;
  refresh: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState<any>(null);

  const handleSend = async () => {
    if (!question) return;
    const r = await api("/patient/assistant/ask", {
      method: "POST",
      body: JSON.stringify({ question }),
    });
    setReply(r);
    setQuestion("");
    refresh();
  };

  return (
    <>
      <div className="assistant-intro">
        <span className="ai-avatar">
          <Sparkles />
        </span>
        <div>
          <b>A little clarity, whenever you need it.</b>
          <p>
            Ask about a food, a meal swap, or medicine timing. New guidance may
            need your doctorâ€™s review.
          </p>
        </div>
      </div>
      <Card
        title="Ask your nutrition assistant"
        subtitle="Personalized to your care profile"
        icon={MessageCircle}
      >
        <div className="chat-history">
          {(data?.messages || []).slice(-5).map((m: any) => (
            <div className="chat-pair" key={m.id}>
              <div className="bubble user-bubble">{m.question}</div>
              <div className="bubble assistant-bubble">
                {m.answer}
                <Badge status={m.status} />
              </div>
            </div>
          ))}
          {reply && (
            <div className="bubble assistant-bubble">
              {reply.answer}
              {reply.food && (
                <div className="macro-mini">
                  {reply.food.calories} kcal Â· {reply.food.proteinG}g protein
                  Â· {reply.food.sodiumMg}mg sodium
                </div>
              )}
              <Badge status={reply.verificationStatus} />
            </div>
          )}
        </div>
        <div className="suggestions">
          {[
            "Can I eat mango with diabetes?",
            "Low-sodium breakfast swap for idli",
            "When should I take Metformin?",
          ].map((x) => (
            <button key={x} onClick={() => setQuestion(x)}>
              {x}
            </button>
          ))}
        </div>
        <div className="chat-input">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === "Enter" && question) {
                await handleSend();
              }
            }}
            placeholder="Ask about a food or your care planâ€¦"
          />
          <button aria-label="Send question" onClick={handleSend}>
            <ArrowRight />
          </button>
        </div>
      </Card>
      <p className="disclaimer">{DISCLAIMER}</p>
    </>
  );
}

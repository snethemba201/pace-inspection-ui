/* eslint-disable no-new-func */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
const PACE_ORANGE = "#F37A1F";
const CHAT_BG = "#0b141a";
const BTN_BG = "#2a3942";

function evaluateExpression(expr, lines, answers) {
  if (!expr || !expr.trim()) return true;

  const matches = [...expr.matchAll(/\{\{([^}]+)\}\}([><=!]+)(\d+)/g)];
  let result = expr;

  for (const [full, refName, op, valStr] of matches) {
    const refLine = lines.find(l => l.name === refName.trim());

    if (!refLine) {
      result = result.replace(full, "false");
      continue;
    }

    const ans = answers[refLine.id];

    if (ans == null) {
      result = result.replace(full, "false");
      continue;
    }

    const opt = refLine.condition_options?.find(o => o.label === ans);
    const sev = opt ? opt.severity_level : 0;
    const ref = parseFloat(valStr);

    const bool =
      op === ">" ? sev > ref :
      op === "<" ? sev < ref :
      op === ">=" ? sev >= ref :
      op === "<=" ? sev <= ref :
      op === "!=" ? sev !== ref :
      sev === ref;

    result = result.replace(full, bool ? "true" : "false");
  }

  try {
    return Function('"use strict";return(' + result + ")")();
  } catch {
    return true;
  }
}

function evalCondReq(condition, lineId, lines, answers) {
  if (!condition) return false;

  const line = lines.find(l => l.id === lineId);
  const ans = answers[lineId];

  if (!line || ans == null) return false;

  const opt = line.condition_options?.find(o => o.label === ans);
  const sev = opt ? opt.severity_level : 0;
  const resolved = condition.replace(/\{\{severity_level\}\}/g, sev);

  try {
    return Function('"use strict";return(' + resolved + ")")();
  } catch {
    return false;
  }
}

export default function DynamicForm({ data }) {
  const result = data.result;
  const lines = result.lines || [];
  const storageKey = `pace-inspection-${result.name}`;

  const [answers, setAnswers] = useState({});
  const [notes, setNotes] = useState({});
  const [pics, setPics] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState("");
  const [typing, setTyping] = useState(true);
  const [title, setTitle] = useState("");

  const chatRef = useRef(null);
  const fileRef = useRef(null);
  const fileTarget = useRef(null);

  const isVisible = (line) => {
    if (!line.conditional_expression) return true;
    return evaluateExpression(line.conditional_expression, lines, answers);
  };
  const showNote = (line) => {
    if (["Required", "Optional"].includes(line.note_requirement)) return true;
    if (line.note_requirement === "Conditional") {
      return evalCondReq(line.note_requirement_condition, line.id, lines, answers);
    }
    return false;
  };
  const shouldShowPhoto = (line) => {
  if (line.pic_requirement === "Required") return true;
  if (line.pic_requirement === "Optional") return true;

  if (line.pic_requirement === "Conditional") {
    return evalCondReq(line.pic_requirement_condition, line.id, lines, answers);
  }

  return false;
};

const shouldRequirePhoto = (line) => {
  if (line.pic_requirement === "Required") return true;

  if (line.pic_requirement === "Conditional") {
    return evalCondReq(line.pic_requirement_condition, line.id, lines, answers);
  }

  return false;
};

  const visibleLines = lines.filter(isVisible);
  const currentLine = visibleLines[currentIndex];

  const progress = visibleLines.length
    ? Math.round(((currentIndex + 1) / visibleLines.length) * 100)
    : 0;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      const parsed = JSON.parse(saved);
      setAnswers(parsed.answers || {});
      setNotes(parsed.notes || {});
      setPics(parsed.pics || {});
      setCurrentIndex(parsed.currentIndex || 0);
    } else {
      setAnswers({});
      setNotes({});
      setPics({});
      setCurrentIndex(0);
    }

    setSubmitted(false);
    setShowSummary(false);
    setError("");
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({
      answers,
      notes,
      pics,
      currentIndex
    }));
  }, [answers, notes, pics, currentIndex, storageKey]);

  useEffect(() => {
    setTyping(true);
    const timer = setTimeout(() => setTyping(false), 450);
    return () => clearTimeout(timer);
  }, [currentIndex, result.name]);

  useEffect(() => {
    const fullText = "Pace Auto Group";
    let i = 0;
    setTitle("");

    const interval = setInterval(() => {
      i++;
      setTitle(fullText.slice(0, i));

      if (i === fullText.length) clearInterval(interval);
    }, 65);

    return () => clearInterval(interval);
  }, [result.name]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [answers, notes, pics, currentIndex, error, typing]);

  const selectAnswer = (lineId, label) => {
    setAnswers(prev => ({ ...prev, [lineId]: label }));
    setError("");
  };

  const validateCurrentLine = () => {
    if (!currentLine) return false;

    const hasOptions = currentLine.condition_options?.length > 0;
    const answer = answers[currentLine.id];
    const note = notes[currentLine.id]?.trim();
    const linePics = pics[currentLine.id] || [];
    const requiredPics = currentLine.num_pics || 1;

    if (hasOptions && !answer) {
      setError("Please select a condition before continuing.");
      return false;
    }

    if (showNote(currentLine) && currentLine.note_requirement === "Required" && !note) {
      setError("Please add the required note before continuing.");
      return false;
    }

    if (shouldRequirePhoto(currentLine) && linePics.length < requiredPics) {
      setError(`Please upload ${requiredPics} required photo(s) before continuing.`);
      return false;
    }

    setError("");
    return true;
  };

  const goNext = () => {
    if (!validateCurrentLine()) return;

    if (currentIndex < visibleLines.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setShowSummary(true);
    }
  };

  const goBack = () => {
    if (showSummary) {
      setShowSummary(false);
      return;
    }

    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setError("");
    }
  };

  const submitInspection = () => {
    setSubmitted(true);
    localStorage.removeItem(storageKey);
  };

  const handleFile = (e) => {
    const id = fileTarget.current;
    if (!id || !e.target.files.length) return;

    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();

      reader.onload = ev => {
        setPics(prev => ({
          ...prev,
          [id]: [...(prev[id] || []), ev.target.result],
        }));
      };


      reader.readAsDataURL(file);
    });

    setError("");
    e.target.value = "";
  };
   const removePhoto = (lineId, photoIndex) => {
  setPics(prev => ({
    ...prev,
    [lineId]: (prev[lineId] || []).filter((_, index) => index !== photoIndex),
  }));
};
  const now = new Date().toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (submitted) {
    return (
      <div style={{
        background: CHAT_BG,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24
      }}>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 14 }}
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "rgba(37,211,102,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </motion.div>

        <div style={{ fontSize: 20, fontWeight: 700, color: "#e9edef" }}>
          Inspection Submitted
        </div>

        <div style={{
          fontSize: 14,
          color: "rgba(255,255,255,0.5)",
          textAlign: "center",
          lineHeight: 1.6
        }}>
          All checks recorded successfully.
        </div>
      </div>
    );
  }

  if (!currentLine) {
    return (
      <div style={{
        background: CHAT_BG,
        minHeight: "100vh",
        color: "#e9edef",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        No inspection questions found.
      </div>
    );
  }

  const line = currentLine;
  const picVisible = shouldShowPhoto(line);
  const noteVisible = showNote(line);
  const numPics = line.num_pics || 1;
  const linePics = pics[line.id] || [];

  if (showSummary) {
    return (
    <div style={{
  background: CHAT_BG,
  height: "100vh", // 👈 CHANGE THIS
  display: "flex",
  flexDirection: "column",
  maxWidth: 640,
  margin: "0 auto",
  fontFamily: "'Segoe UI', system-ui, sans-serif",
  color: "#e9edef"
}}>
        <div style={{
          background: "linear-gradient(135deg, #1B365D, #142844)",
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)"
        }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.18, 1] }}
            transition={{ type: "spring", stiffness: 260, damping: 10 }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "linear-gradient(135deg, #F37A1F, #ff9a3c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 16,
              color: "#fff",
              boxShadow: "0 6px 18px rgba(243,122,31,0.35)"
            }}
          >
            P
          </motion.div>

          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Review Inspection</div>
            <div style={{ fontSize: 12, opacity: 0.65 }}>{result.name}</div>
          </div>
        </div>

        <div style={{
  padding: 16,
  overflowY: "auto",
  flex: 1,
  minHeight: 0,
  maxHeight: "calc(100vh - 140px)"
}}>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: "linear-gradient(145deg, #202c33, #1a252c)",
              borderRadius: 14,
              padding: 14,
              marginBottom: 14,
              border: "1px solid rgba(255,255,255,0.06)"
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
              Inspection Summary
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
              Review the captured answers before submitting.
            </div>
          </motion.div>

          {visibleLines.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              style={{
                background: "rgba(255,255,255,0.045)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                padding: 12,
                marginBottom: 10
              }}
            >
              <div style={{
                fontSize: 12,
                color: PACE_ORANGE,
                fontWeight: 700,
                marginBottom: 4
              }}>
                {index + 1}. {item.name}
              </div>

              <div style={{ fontSize: 13, marginBottom: 4 }}>
                <strong>Condition:</strong> {answers[item.id] || "N/A"}
              </div>

              <div style={{ fontSize: 13, marginBottom: 4 }}>
                <strong>Note:</strong> {notes[item.id] || "No note added"}
              </div>

              <div style={{ fontSize: 13 }}>
                <strong>Photos:</strong> {(pics[item.id] || []).length} uploaded
              </div>
            </motion.div>
          ))}
        </div>

        <div style={{
          padding: "10px 12px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          gap: 8
        }}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={goBack}
            style={{
              width: 120,
              background: BTN_BG,
              color: "#e9edef",
              border: "none",
              borderRadius: 25,
              padding: 14,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Back
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={submitInspection}
            style={{
              flex: 1,
              background: PACE_ORANGE,
              color: "#fff",
              border: "none",
              borderRadius: 25,
              padding: 14,
              fontSize: 15,
              fontWeight: 800,
              cursor: "pointer"
            }}
          >
            Confirm & Submit
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: CHAT_BG,
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      maxWidth: 480,
      margin: "0 auto",
      fontFamily: "'Segoe UI', system-ui, sans-serif"
    }}>
      <div style={{
        background: "linear-gradient(135deg, #1B365D, #142844)",
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        flexShrink: 0
      }}>
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: [0, 1.25, 1], rotate: [0, 8, 0] }}
          transition={{ type: "spring", stiffness: 260, damping: 10 }}
          whileHover={{ scale: 1.12 }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "linear-gradient(135deg, #F37A1F, #ff9a3c)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 16,
            color: "#fff",
            cursor: "pointer",
            boxShadow: "0 6px 18px rgba(243,122,31,0.35)"
          }}
        >
          P
        </motion.div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#fff", minWidth: 132 }}>
              {title}
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 0.9 }}
                style={{ color: PACE_ORANGE }}
              >
                
              </motion.span>
            </span>

          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "rgba(255,255,255,0.55)",
            marginTop: 4
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#25D366",
              boxShadow: "0 0 8px rgba(37,211,102,0.7)"
            }} />
            Live Inspection • {result.name}
          </div>
        </div>
      </div>

      <div style={{ height: 2, background: "rgba(255,255,255,0.05)", flexShrink: 0 }}>
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.35 }}
          style={{
            height: "100%",
            background: PACE_ORANGE
          }}
        />
      </div>

      <div ref={chatRef} style={{
        flex: 1,
        overflowY: "auto",
        padding: "12px 12px 8px",
        display: "flex",
        flexDirection: "column",
        gap: 10
      }}>
        <div style={{ textAlign: "center", margin: "4px 0" }}>
          <span style={{
            background: "rgba(255,255,255,0.07)",
            color: "rgba(255,255,255,0.5)",
            fontSize: 11,
            padding: "4px 12px",
            borderRadius: 10
          }}>
            {new Date().toLocaleDateString("en-ZA", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric"
})}
          </span>
        </div>

        <div style={{
          alignSelf: "center",
          fontSize: 11,
          color: "rgba(255,255,255,0.45)",
          marginBottom: 4
        }}>
          Question {currentIndex + 1} of {visibleLines.length} • {progress}% complete
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: "87%" }}>
          <div style={{
            fontSize: 11,
            color: PACE_ORANGE,
            fontWeight: 600,
            marginBottom: 3,
            paddingLeft: 2
          }}>
            Inspection Assistant
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={line.id}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{
                background: "linear-gradient(145deg, #202c33, #1a252c)",
                borderRadius: "10px 10px 10px 2px",
                padding: "10px 12px",
                position: "relative",
                border: "1px solid rgba(255,255,255,0.05)"
              }}
            >
              <div style={{ fontSize: 14, color: "#e9edef", lineHeight: 1.45 }}>
                {typing ? "Typing..." : line.name}
                {!typing && line.condition_label && (
                  <span style={{
                    color: "rgba(255,255,255,0.4)",
                    fontSize: 12,
                    marginLeft: 6
                  }}>
                    ({line.condition_label})
                  </span>
                )}
              </div>

              {!typing && (
                <>
                  {answers[line.id] && (
                    <div style={{ marginTop: 6, fontSize: 11, color: "#25D366" }}>
                      ✓ Answer selected
                    </div>
                  )}

                  <div style={{
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                    marginTop: 8
                  }}>
                    {line.note_requirement && line.note_requirement !== "None" && (
                      <span style={{
                        fontSize: 10,
                        color: "#e9edef",
                        background: "rgba(255,255,255,0.08)",
                        padding: "3px 8px",
                        borderRadius: 999
                      }}>
                        Note: {line.note_requirement}
                      </span>
                    )}

                    {line.pic_requirement && line.pic_requirement !== "None" && (
                      <span style={{
                        fontSize: 10,
                        color: "#e9edef",
                        background: "rgba(255,255,255,0.08)",
                        padding: "3px 8px",
                        borderRadius: 999
                      }}>
                        Photo: {line.pic_requirement}
                      </span>
                    )}
                  </div>

                  {line.condition_options?.length > 0 && (
                    <div style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginTop: 10
                    }}>
                      {line.condition_options.map(opt => (
                        <motion.button
                          key={opt.label}
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.94 }}
                          onClick={() => selectAnswer(line.id, opt.label)}
                          style={{
                            background: answers[line.id] === opt.label
                              ? "linear-gradient(135deg, #F37A1F, #ff9a3c)"
                              : BTN_BG,
                            boxShadow: answers[line.id] === opt.label
                              ? "0 0 14px rgba(243,122,31,0.45)"
                              : "none",
                            border: `1px solid ${answers[line.id] === opt.label ? PACE_ORANGE : "rgba(255,255,255,0.1)"}`,
                            color: "#e9edef",
                            fontSize: 13,
                            padding: "6px 14px",
                            borderRadius: 20,
                            cursor: "pointer",
                            fontWeight: answers[line.id] === opt.label ? 600 : 400
                          }}
                        >
                          {opt.label}
                        </motion.button>
                      ))}
                    </div>
                  )}

                  {picVisible && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.5)",
                        marginBottom: 5
                      }}>
                     Photo {shouldRequirePhoto(line) ? "required" : "optional"}{numPics > 1 ? `(${numPics})` : ""}
                      </div>

                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          fileTarget.current = line.id;
                          fileRef.current.click();
                        }}
                        style={{
                          border: "1px dashed rgba(243,122,31,0.4)",
                          borderRadius: 8,
                          padding: 10,
                          textAlign: "center",
                          cursor: "pointer",
                          background: "rgba(243,122,31,0.05)"
                        }}
                      >
                        <div style={{ fontSize: 12, color: PACE_ORANGE }}>
                          Tap to upload photo
                        </div>

                        <div style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 4,
                          marginTop: 5,
                          justifyContent: "center"
                        }}>
                          {linePics.map((src, i) => (
  <div key={i} style={{ position: "relative" }}>
    <img
      src={src}
      alt=""
      style={{
        width: 56,
        height: 56,
        borderRadius: 6,
        objectFit: "cover",
        border: "1px solid rgba(255,255,255,0.1)"
      }}
    />

    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        removePhoto(line.id, i);
      }}
      style={{
        position: "absolute",
        top: -6,
        right: -6,
        width: 20,
        height: 20,
        borderRadius: "50%",
        border: "none",
        background: "#ff4d4f",
        color: "#fff",
        fontSize: 12,
        fontWeight: 800,
        cursor: "pointer",
        lineHeight: "20px"
      }}
    >
      ×
    </button>
  </div>
))}
                        </div>

                        {linePics.length > 0 && (
                          <div style={{
                            fontSize: 10,
                            color: "#25D366",
                            marginTop: 4
                          }}>
                            {linePics.length} photo(s) added
                          </div>
                        )}
                      </motion.div>
                    </div>
                  )}

                  {noteVisible && (
                    <textarea
                      placeholder={line.note_requirement === "Required" ? "Note required..." : "Add a note (optional)..."}
                      value={notes[line.id] || ""}
                      onChange={e => {
                        setNotes(prev => ({
                          ...prev,
                          [line.id]: e.target.value
                        }));
                        setError("");
                      }}
                      rows={2}
                      style={{
                        width: "100%",
                        background: "#1a2530",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 8,
                        color: "#e9edef",
                        fontSize: 13,
                        padding: "8px 10px",
                        resize: "none",
                        outline: "none",
                        fontFamily: "inherit",
                        marginTop: 10
                      }}
                    />
                  )}

                  {error && (
                    <div style={{
                      marginTop: 10,
                      background: "rgba(255, 99, 71, 0.12)",
                      color: "#ffb4a8",
                      border: "1px solid rgba(255, 99, 71, 0.25)",
                      borderRadius: 8,
                      padding: "8px 10px",
                      fontSize: 12,
                      lineHeight: 1.4
                    }}>
                      {error}
                    </div>
                  )}
                </>
              )}

              <div style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.35)",
                textAlign: "right",
                marginTop: 5
              }}>
                {now}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div style={{
        padding: "10px 12px",
        background: CHAT_BG,
        borderTop: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
        display: "flex",
        gap: 8
      }}>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={goBack}
          disabled={currentIndex === 0}
          style={{
            width: 110,
            background: currentIndex === 0 ? "rgba(255,255,255,0.06)" : BTN_BG,
            color: currentIndex === 0 ? "rgba(255,255,255,0.25)" : "#e9edef",
            border: "none",
            borderRadius: 25,
            padding: 14,
            fontSize: 14,
            fontWeight: 700,
            cursor: currentIndex === 0 ? "not-allowed" : "pointer"
          }}
        >
          Back
        </motion.button>

        <motion.button
          whileHover={!typing ? { scale: 1.02 } : {}}
          whileTap={!typing ? { scale: 0.96 } : {}}
          onClick={goNext}
          disabled={typing}
          style={{
            flex: 1,
            background: typing ? "rgba(243,122,31,0.45)" : PACE_ORANGE,
            color: "#fff",
            border: "none",
            borderRadius: 25,
            padding: 14,
            fontSize: 15,
            fontWeight: 700,
            cursor: typing ? "not-allowed" : "pointer",
            letterSpacing: "0.3px"
          }}
        >
          {currentIndex === visibleLines.length - 1 ? "Review Summary" : "Next"}
        </motion.button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={handleFile}
      />
    </div>
  );
}
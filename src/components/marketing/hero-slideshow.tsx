"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

const slides = [
  { image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=88", label: "Learn with momentum", text: "Live instruction, practical projects, real progress." },
  { image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=88", label: "Build useful skills", text: "Turn curiosity into work you can show." },
  { image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1600&q=88", label: "Grow together", text: "A supportive learning community for your next chapter." },
];

export function HeroSlideshow() {
  const [active, setActive] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 5500); return () => window.clearInterval(timer); }, []);
  const slide = slides[active];
  return <div className="hero-slideshow" style={{ backgroundImage: `linear-gradient(180deg, rgba(14,16,36,.04), rgba(14,16,36,.72)), url(${slide.image})` }}><div className="slide-copy"><span>{slide.label}</span><small>{slide.text}</small></div><div className="slide-controls"><button type="button" aria-label="Previous image" onClick={() => setActive((active - 1 + slides.length) % slides.length)}><ChevronLeft size={18} /></button><div className="slide-dots">{slides.map((item, index) => <button key={item.image} type="button" aria-label={`Show image ${index + 1}`} className={index === active ? "active" : ""} onClick={() => setActive(index)} />)}</div><button type="button" aria-label="Next image" onClick={() => setActive((active + 1) % slides.length)}><ChevronRight size={18} /></button></div></div>;
}

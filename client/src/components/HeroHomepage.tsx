import React, { useEffect, useRef } from "react";
const HeroHomepage: React.FC = () => {
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (bgRef.current) {
        const scrollY = window.scrollY * 0.4; // Adjust this factor for intensity
        bgRef.current.style.transform = `translateY(${scrollY}px)`;
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative h-fit overflow-hidden">
      {/* Background with Parallax Effect */}
      <div
        ref={bgRef}
        className="absolute inset-0 will-change-transform"
      >
        <img src="/src/assets/image.png" alt="" className="object-cover w-full h-full" />
      </div>

      {/* Foreground Content */}
      <div className="relative flex flex-col justify-center h-full px-[8vw] py-[30vh] text-white">
        <div className="flex gap-[1em]">
          <div className="font-bold text-[120px] leading-[0.8em]">
            EVERY
          </div>
          <div className="text-[50px] leading-[1em] font-semibold">
            <p>RESOURCE COUNTS</p>
            <p>ACTION MATTERS</p>
          </div>
        </div>
        <p className="text-[26px] py-[1em] max-w-3/5">
          Join ResQ to ensure no fire station stands alone in the fight against disasters
        </p>
        <a href="#learnMore" className="mainBtnRed text-[20px] px-[1.3em] py-[0.5em] rounded-[10px] w-fit">Learn More</a>
      </div>
    </div>
  );
};

export default HeroHomepage;
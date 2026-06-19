import svgPaths from "./svg-1p6ahtfypp";

function MuseumRoom() {
  return <div className="absolute h-[729px] left-0 top-0 w-[1071px]" data-name="MuseumRoom" />;
}

function Icon() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p33f6b680} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8" strokeWidth="1.25" />
          <path d="M15.8333 10H4.16667" id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8" strokeWidth="1.25" />
        </g>
      </svg>
    </div>
  );
}

function ButtonGoBack() {
  return (
    <div className="bg-[rgba(255,255,255,0.05)] relative rounded-[16777200px] shrink-0 size-[48px]" data-name="Button - Go back">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[16777200px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center p-px relative size-full">
        <Icon />
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="relative shrink-0 w-full" data-name="Header">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start justify-between relative size-full">
        <ButtonGoBack />
      </div>
    </div>
  );
}

function Heading() {
  return (
    <div className="h-[31.2px] relative shrink-0 w-[211.819px]" data-name="Heading 1">
      <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Cormorant_Garamond:Medium',sans-serif] font-medium leading-[31.2px] left-[106.65px] lowercase text-[31.2px] text-center text-shadow-[0px_1px_6px_rgba(0,0,0,0.55)] text-white top-[-0.33px] tracking-[0.78px] whitespace-nowrap">museum of hope</p>
    </div>
  );
}

function Heading1Margin() {
  return (
    <div className="relative shrink-0" data-name="Heading 1 (margin)">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[7.8px] relative size-full">
        <Heading />
      </div>
    </div>
  );
}

function Paragraph() {
  return (
    <div className="h-[18.2px] max-w-[249.59999084472656px] relative shrink-0 w-[201.825px]" data-name="Paragraph">
      <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Cormorant_Garamond:Italic',sans-serif] font-normal italic leading-[18.2px] left-[101px] text-[13px] text-center text-shadow-[0px_1px_6px_rgba(0,0,0,0.55)] text-white top-0 whitespace-nowrap">for the light that persists through the cracks.</p>
    </div>
  );
}

function ParagraphMargin() {
  return (
    <div className="relative shrink-0" data-name="Paragraph (margin)">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[26px] relative size-full">
        <Paragraph />
      </div>
    </div>
  );
}

function Container1() {
  return <div className="absolute bg-gradient-to-r from-[rgba(0,0,0,0)] h-[33.8px] left-[-158.72px] to-[rgba(0,0,0,0)] top-[0.65px] via-1/2 via-[rgba(255,255,255,0.1)] w-[159.25px]" data-name="Container" />;
}

function Button() {
  return (
    <div className="bg-[rgba(255,255,255,0.22)] h-[35.1px] relative rounded-[10905181px] shrink-0 w-[160.784px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center justify-center overflow-clip px-[26.65px] py-[11.05px] relative rounded-[inherit] size-full">
        <p className="[word-break:break-word] font-['Cinzel:Black',sans-serif] font-black leading-[13px] relative shrink-0 text-[9.1px] text-center text-shadow-[0px_1px_6px_rgba(0,0,0,0.55)] text-white tracking-[2.73px] uppercase whitespace-nowrap">enter memory</p>
        <Container1 />
      </div>
      <div aria-hidden className="absolute border-[0.65px] border-[rgba(255,255,255,0.2)] border-solid inset-0 pointer-events-none rounded-[10905181px] shadow-[0px_5.2px_20.8px_0px_rgba(0,0,0,0.3)]" />
    </div>
  );
}

function Container() {
  return (
    <div className="bg-[rgba(255,255,255,0.18)] h-[174px] max-w-[332.79998779296875px] relative rounded-[15.6px] shrink-0 w-[289px]" data-name="Container">
      <div aria-hidden className="absolute border-[0.65px] border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[15.6px] shadow-[0px_20.8px_41.6px_0px_rgba(0,0,0,0.5)]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center max-w-[inherit] p-[31.85px] relative size-full">
        <Heading1Margin />
        <ParagraphMargin />
        <Button />
      </div>
    </div>
  );
}

function MainContent() {
  return (
    <div className="flex-[585_0_0] min-h-px relative w-full" data-name="Main Content">
      <div className="flex flex-col items-center justify-end size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center justify-end pb-[64px] relative size-full">
          <Container />
        </div>
      </div>
    </div>
  );
}

function MuseumRoom1() {
  return (
    <div className="absolute content-stretch flex flex-col h-[729px] items-start left-0 p-[48px] top-0 w-[1071px]" data-name="MuseumRoom">
      <Header />
      <MainContent />
    </div>
  );
}

function Section() {
  return (
    <div className="bg-black h-[729px] relative shrink-0 w-[1071px]" data-name="Section">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid overflow-clip relative rounded-[inherit] size-full">
        <MuseumRoom />
        <MuseumRoom1 />
      </div>
    </div>
  );
}

function AppLayout() {
  return (
    <div className="bg-[#f9f7f4] h-[729px] relative shrink-0 w-full" data-name="AppLayout">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <Section />
      </div>
    </div>
  );
}

function Body() {
  return (
    <div className="bg-[#f9f7f4] h-[729px] relative shrink-0 w-full" data-name="Body">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <AppLayout />
      </div>
    </div>
  );
}

function MuseumRoom2() {
  return <div className="absolute h-[729px] left-0 top-0 w-[1071px]" data-name="MuseumRoom" />;
}

function Icon1() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p33f6b680} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8" strokeWidth="1.25" />
          <path d="M15.8333 10H4.16667" id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8" strokeWidth="1.25" />
        </g>
      </svg>
    </div>
  );
}

function ButtonGoBack1() {
  return (
    <div className="bg-[rgba(255,255,255,0.05)] relative rounded-[16777200px] shrink-0 size-[48px]" data-name="Button - Go back">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[16777200px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center p-px relative size-full">
        <Icon1 />
      </div>
    </div>
  );
}

function Header1() {
  return (
    <div className="relative shrink-0 w-full" data-name="Header">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start justify-between relative size-full">
        <ButtonGoBack1 />
      </div>
    </div>
  );
}

function Heading1() {
  return (
    <div className="h-[31.2px] relative shrink-0 w-[211.819px]" data-name="Heading 1">
      <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Cormorant_Garamond:Medium',sans-serif] font-medium leading-[31.2px] left-[106.65px] lowercase text-[31.2px] text-center text-shadow-[0px_1px_6px_rgba(0,0,0,0.55)] text-white top-[-0.33px] tracking-[0.78px] whitespace-nowrap">museum of hope</p>
    </div>
  );
}

function Heading1Margin1() {
  return (
    <div className="relative shrink-0" data-name="Heading 1 (margin)">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[7.8px] relative size-full">
        <Heading1 />
      </div>
    </div>
  );
}

function Paragraph1() {
  return (
    <div className="h-[18.2px] max-w-[249.59999084472656px] relative shrink-0 w-[201.825px]" data-name="Paragraph">
      <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Cormorant_Garamond:Italic',sans-serif] font-normal italic leading-[18.2px] left-[101px] text-[13px] text-center text-shadow-[0px_1px_6px_rgba(0,0,0,0.55)] text-white top-0 whitespace-nowrap">for the light that persists through the cracks.</p>
    </div>
  );
}

function ParagraphMargin1() {
  return (
    <div className="relative shrink-0" data-name="Paragraph (margin)">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[26px] relative size-full">
        <Paragraph1 />
      </div>
    </div>
  );
}

function Container3() {
  return <div className="absolute bg-gradient-to-r from-[rgba(0,0,0,0)] h-[33.8px] left-[-158.72px] to-[rgba(0,0,0,0)] top-[0.65px] via-1/2 via-[rgba(255,255,255,0.1)] w-[159.25px]" data-name="Container" />;
}

function Button1() {
  return (
    <div className="bg-[rgba(255,255,255,0.22)] h-[35.1px] relative rounded-[10905181px] shrink-0 w-[160.784px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center justify-center overflow-clip px-[26.65px] py-[11.05px] relative rounded-[inherit] size-full">
        <p className="[word-break:break-word] font-['Cinzel:Black',sans-serif] font-black leading-[13px] relative shrink-0 text-[9.1px] text-center text-shadow-[0px_1px_6px_rgba(0,0,0,0.55)] text-white tracking-[2.73px] uppercase whitespace-nowrap">enter memory</p>
        <Container3 />
      </div>
      <div aria-hidden className="absolute border-[0.65px] border-[rgba(255,255,255,0.2)] border-solid inset-0 pointer-events-none rounded-[10905181px] shadow-[0px_5.2px_20.8px_0px_rgba(0,0,0,0.3)]" />
    </div>
  );
}

function Container2() {
  return (
    <div className="bg-[rgba(255,255,255,0.18)] h-[174px] max-w-[332.79998779296875px] relative rounded-[15.6px] shrink-0 w-[289px]" data-name="Container">
      <div aria-hidden className="absolute border-[0.65px] border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[15.6px] shadow-[0px_20.8px_41.6px_0px_rgba(0,0,0,0.5)]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center max-w-[inherit] p-[31.85px] relative size-full">
        <Heading1Margin1 />
        <ParagraphMargin1 />
        <Button1 />
      </div>
    </div>
  );
}

function MainContent1() {
  return (
    <div className="flex-[585_0_0] min-h-px relative w-full" data-name="Main Content">
      <div className="flex flex-col items-center justify-end size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center justify-end pb-[64px] relative size-full">
          <Container2 />
        </div>
      </div>
    </div>
  );
}

function MuseumRoom3() {
  return (
    <div className="absolute content-stretch flex flex-col h-[729px] items-start left-0 p-[48px] top-0 w-[1071px]" data-name="MuseumRoom">
      <Header1 />
      <MainContent1 />
    </div>
  );
}

function Section1() {
  return (
    <div className="bg-black h-[729px] relative shrink-0 w-[1071px]" data-name="Section">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid overflow-clip relative rounded-[inherit] size-full">
        <MuseumRoom2 />
        <MuseumRoom3 />
      </div>
    </div>
  );
}

function AppLayout1() {
  return (
    <div className="bg-[#f9f7f4] h-[729px] relative shrink-0 w-full" data-name="AppLayout">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <Section1 />
      </div>
    </div>
  );
}

function Body1() {
  return (
    <div className="bg-[#f9f7f4] h-[729px] relative shrink-0 w-[1227px]" data-name="Body">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <AppLayout1 />
      </div>
    </div>
  );
}

function MuseumRoom4() {
  return <div className="absolute h-[729px] left-0 top-0 w-[1071px]" data-name="MuseumRoom" />;
}

function Icon2() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p33f6b680} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8" strokeWidth="1.25" />
          <path d="M15.8333 10H4.16667" id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8" strokeWidth="1.25" />
        </g>
      </svg>
    </div>
  );
}

function ButtonGoBack2() {
  return (
    <div className="bg-[rgba(255,255,255,0.05)] relative rounded-[16777200px] shrink-0 size-[48px]" data-name="Button - Go back">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[16777200px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center p-px relative size-full">
        <Icon2 />
      </div>
    </div>
  );
}

function Header2() {
  return (
    <div className="relative shrink-0 w-full" data-name="Header">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start justify-between relative size-full">
        <ButtonGoBack2 />
      </div>
    </div>
  );
}

function Heading2() {
  return (
    <div className="h-[48px] relative shrink-0 w-[325.875px]" data-name="Heading 1">
      <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Cormorant_Garamond:Medium',sans-serif] font-medium leading-[48px] left-[163.5px] lowercase text-[48px] text-center text-shadow-[0px_1px_6px_rgba(0,0,0,0.55)] text-white top-[-0.5px] tracking-[1.2px] whitespace-nowrap">museum of hope</p>
    </div>
  );
}

function Heading1Margin2() {
  return (
    <div className="relative shrink-0" data-name="Heading 1 (margin)">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[12px] relative size-full">
        <Heading2 />
      </div>
    </div>
  );
}

function Paragraph2() {
  return (
    <div className="h-[28px] max-w-[384px] relative shrink-0 w-[310.5px]" data-name="Paragraph">
      <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Cormorant_Garamond:Italic',sans-serif] font-normal italic leading-[28px] left-[155.5px] text-[20px] text-center text-shadow-[0px_1px_6px_rgba(0,0,0,0.55)] text-white top-0 whitespace-nowrap">for the light that persists through the cracks.</p>
    </div>
  );
}

function ParagraphMargin2() {
  return (
    <div className="relative shrink-0" data-name="Paragraph (margin)">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[40px] relative size-full">
        <Paragraph2 />
      </div>
    </div>
  );
}

function Container5() {
  return <div className="absolute bg-gradient-to-r from-[rgba(0,0,0,0)] h-[52px] left-[-244.18px] to-[rgba(0,0,0,0)] top-px via-1/2 via-[rgba(255,255,255,0.1)] w-[245px]" data-name="Container" />;
}

function Button2() {
  return (
    <div className="h-[54px] relative rounded-[16777200px] shrink-0 w-[247.359px]" data-name="Button">
      <div aria-hidden className="absolute bg-[rgba(255,255,255,0.2)] bg-clip-padding border-0 border-[transparent] border-solid inset-0 pointer-events-none rounded-[16777200px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center justify-center overflow-clip px-[41px] py-[17px] relative rounded-[inherit] size-full">
        <p className="[word-break:break-word] font-['Cinzel:Bold',sans-serif] font-bold leading-[20px] relative shrink-0 text-[14px] text-center text-shadow-[0px_1px_6px_rgba(0,0,0,0.4),0px_1px_6px_rgba(0,0,0,0.55)] text-white tracking-[4.2px] uppercase whitespace-nowrap">enter memory</p>
        <Container5 />
      </div>
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1px_8px_0px_rgba(255,217,128,0.2)]" />
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.5)] border-solid inset-0 pointer-events-none rounded-[16777200px] shadow-[0px_12px_32px_-6px_rgba(0,0,0,0.4)]" />
    </div>
  );
}

function Container4() {
  return (
    <div className="bg-[rgba(255,255,255,0.18)] h-[280px] max-w-[512px] relative rounded-[24px] shrink-0" data-name="Container">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[24px] shadow-[0px_32px_64px_0px_rgba(0,0,0,0.5)]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center max-w-[inherit] p-[49px] relative size-full">
        <Heading1Margin2 />
        <ParagraphMargin2 />
        <Button2 />
      </div>
    </div>
  );
}

function MainContent2() {
  return (
    <div className="flex-[585_0_0] min-h-px relative w-full" data-name="Main Content">
      <div className="flex flex-col items-center justify-end size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center justify-end pb-[64px] relative size-full">
          <Container4 />
        </div>
      </div>
    </div>
  );
}

function MuseumRoom5() {
  return (
    <div className="absolute content-stretch flex flex-col h-[729px] items-start left-0 p-[48px] top-0 w-[1071px]" data-name="MuseumRoom">
      <Header2 />
      <MainContent2 />
    </div>
  );
}

function Section2() {
  return (
    <div className="bg-black h-[729px] relative shrink-0 w-[1071px]" data-name="Section">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid overflow-clip relative rounded-[inherit] size-full">
        <MuseumRoom4 />
        <MuseumRoom5 />
      </div>
    </div>
  );
}

function AppLayout2() {
  return (
    <div className="bg-[#f9f7f4] h-[729px] relative shrink-0 w-full" data-name="AppLayout">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <Section2 />
      </div>
    </div>
  );
}

function Body2() {
  return (
    <div className="bg-[#f9f7f4] h-[729px] relative shrink-0 w-full" data-name="Body">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <AppLayout2 />
      </div>
    </div>
  );
}

function CinematicMuseumInteriorDesign1() {
  return (
    <div className="bg-[#f9f7f4] h-[729px] relative shrink-0 w-[1071px]" data-name="Cinematic Museum Interior Design">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] size-full">
        <Body2 />
      </div>
    </div>
  );
}

function MuseumRoom6() {
  return <div className="absolute h-[729px] left-0 top-0 w-[1071px]" data-name="MuseumRoom" />;
}

function Icon3() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p33f6b680} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8" strokeWidth="1.25" />
          <path d="M15.8333 10H4.16667" id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8" strokeWidth="1.25" />
        </g>
      </svg>
    </div>
  );
}

function ButtonGoBack3() {
  return (
    <div className="bg-[rgba(255,255,255,0.05)] relative rounded-[16777200px] shrink-0 size-[48px]" data-name="Button - Go back">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[16777200px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center p-px relative size-full">
        <Icon3 />
      </div>
    </div>
  );
}

function Header3() {
  return (
    <div className="relative shrink-0 w-full" data-name="Header">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start justify-between relative size-full">
        <ButtonGoBack3 />
      </div>
    </div>
  );
}

function Heading3() {
  return (
    <div className="h-[48px] relative shrink-0 w-[348.109px]" data-name="Heading 1">
      <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Cormorant_Garamond:Medium',sans-serif] font-medium leading-[48px] left-[174px] lowercase text-[48px] text-center text-shadow-[0px_1px_6px_rgba(0,0,0,0.55)] text-white top-[-0.5px] tracking-[1.2px] whitespace-nowrap">museum of regret</p>
    </div>
  );
}

function Heading1Margin3() {
  return (
    <div className="relative shrink-0" data-name="Heading 1 (margin)">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[12px] relative size-full">
        <Heading3 />
      </div>
    </div>
  );
}

function ParagraphMargin3() {
  return (
    <div className="relative shrink-0" data-name="Paragraph (margin)">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[40px] relative size-full">
        <p className="[word-break:break-word] font-['Cormorant_Garamond:Italic',sans-serif] font-normal italic leading-[28px] relative shrink-0 text-[20px] text-center text-shadow-[0px_1px_6px_rgba(0,0,0,0.55)] text-white w-[384px]">{`for the words we swallowed and the paths we didn't take.`}</p>
      </div>
    </div>
  );
}

function Container7() {
  return <div className="absolute bg-gradient-to-r from-[rgba(0,0,0,0)] h-[52px] left-[-234.14px] to-[rgba(0,0,0,0)] top-px via-1/2 via-[rgba(255,255,255,0.1)] w-[245px]" data-name="Container" />;
}

function Button3() {
  return (
    <div className="h-[54px] relative rounded-[16777200px] shrink-0 w-[247.359px]" data-name="Button">
      <div aria-hidden className="absolute bg-[rgba(255,255,255,0.2)] bg-clip-padding border-0 border-[transparent] border-solid inset-0 pointer-events-none rounded-[16777200px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center justify-center overflow-clip px-[41px] py-[17px] relative rounded-[inherit] size-full">
        <p className="[word-break:break-word] font-['Cinzel:Bold',sans-serif] font-bold leading-[20px] relative shrink-0 text-[14px] text-center text-shadow-[0px_1px_6px_rgba(0,0,0,0.4),0px_1px_6px_rgba(0,0,0,0.55)] text-white tracking-[4.2px] uppercase whitespace-nowrap">enter memory</p>
        <Container7 />
      </div>
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1px_8px_0px_rgba(255,217,128,0.2)]" />
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.5)] border-solid inset-0 pointer-events-none rounded-[16777200px] shadow-[0px_12px_32px_-6px_rgba(0,0,0,0.4)]" />
    </div>
  );
}

function Container6() {
  return (
    <div className="bg-[rgba(255,255,255,0.18)] h-[308px] max-w-[512px] relative rounded-[24px] shrink-0" data-name="Container">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[24px] shadow-[0px_32px_64px_0px_rgba(0,0,0,0.5)]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center max-w-[inherit] p-[49px] relative size-full">
        <Heading1Margin3 />
        <ParagraphMargin3 />
        <Button3 />
      </div>
    </div>
  );
}

function MainContent3() {
  return (
    <div className="flex-[585_0_0] min-h-px relative w-full" data-name="Main Content">
      <div className="flex flex-col items-center justify-end size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center justify-end pb-[64px] relative size-full">
          <Container6 />
        </div>
      </div>
    </div>
  );
}

function MuseumRoom7() {
  return (
    <div className="absolute content-stretch flex flex-col h-[729px] items-start left-0 p-[48px] top-0 w-[1071px]" data-name="MuseumRoom">
      <Header3 />
      <MainContent3 />
    </div>
  );
}

function Section3() {
  return (
    <div className="bg-black h-[729px] relative shrink-0 w-[1071px]" data-name="Section">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid overflow-clip relative rounded-[inherit] size-full">
        <MuseumRoom6 />
        <MuseumRoom7 />
      </div>
    </div>
  );
}

function AppLayout3() {
  return (
    <div className="bg-[#f9f7f4] h-[729px] relative shrink-0 w-full" data-name="AppLayout">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <Section3 />
      </div>
    </div>
  );
}

function Body3() {
  return (
    <div className="bg-[#f9f7f4] h-[729px] relative shrink-0 w-full" data-name="Body">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <AppLayout3 />
      </div>
    </div>
  );
}

function CinematicMuseumInteriorDesign2() {
  return (
    <div className="bg-[#f9f7f4] h-[729px] relative shrink-0 w-[1071px]" data-name="Cinematic Museum Interior Design">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] size-full">
        <Body3 />
      </div>
    </div>
  );
}

export default function CinematicMuseumInteriorDesign() {
  return (
    <div className="bg-[#f9f7f4] content-stretch flex flex-col items-start relative size-full" data-name="Cinematic Museum Interior Design">
      <Body />
      <Body1 />
      <CinematicMuseumInteriorDesign1 />
      <CinematicMuseumInteriorDesign2 />
    </div>
  );
}
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useChatSession } from '@/hooks/useChatSession';
import { ShortlistProvider, useShortlist } from '@/context/ShortlistContext';
import CompareDrawer from '../product/CompareDrawer';
import ChatInput from './ChatInput';
import MessageBubble from './MessageBubble';
import ShortlistButton from './ShortlistButton';

const SUGGESTED_STARTERS = [
  'Dark sky bollard lights',
  'Luxury villa entrance lighting',
  '5-star hotel full recommendation',
  'Outdoor plaza furniture',
  'Exterior IP65+ fixtures',
  'DALI-compatible luminaires',
];

// ShortlistProvider must wrap ChatContent so useShortlist() can be called inside it.
export default function ChatWindow() {
  return (
    <ShortlistProvider>
      <ChatContent />
    </ShortlistProvider>
  );
}

function ChatContent() {
  const { messages, sessionId, isLoading, sendMessage, clearSession } = useChatSession();
  const { clearAll: clearShortlist } = useShortlist();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear both chat history and shortlist together on "New Chat"
  const handleNewChat = useCallback(() => {
    clearSession();
    clearShortlist();
  }, [clearSession, clearShortlist]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-bega-border-1 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Logo — click to start a new chat */}
          <button
            type="button"
            onClick={handleNewChat}
            disabled={isLoading}
            title="New chat"
            className="flex items-center transition-opacity hover:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg width="79px" height="27px" viewBox="0 0 89 27" version="1.1" xmlns="http://www.w3.org/2000/svg">
              <title>BEGA</title>
              <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g transform="translate(-136.000000, -20.000000)" fill="#000000">
                  <g transform="translate(136.000000, 20.000000)">
                    <path d="M5.00671866,5.38627332 L5.00671866,11.2716356 C5.08488022,11.2784599 5.14733148,11.2886117 5.20978273,11.2886681 C6.93540947,11.2894577 8.66120334,11.3035011 10.3866072,11.2835922 C11.3247688,11.27282 12.2209805,11.0473362 13.0268301,10.5379393 C13.7764123,10.0641866 14.2081671,9.3912321 14.2256602,8.47711497 C14.2442117,7.50704989 13.9790306,6.6612321 13.1694485,6.06441649 C12.4496713,5.53375705 11.6169694,5.37369631 10.7533482,5.37059436 C8.93518663,5.36405206 7.11696936,5.37973102 5.2988078,5.38621692 C5.20822284,5.38655531 5.11763788,5.38627332 5.00671866,5.38627332 L5.00671866,5.38627332 Z M5.00532591,22.6189154 C5.10159331,22.6250065 5.18309749,22.634538 5.26454596,22.634538 C7.02777716,22.6353839 8.79117549,22.6507809 10.5540167,22.6256833 C11.0862173,22.6181258 11.6299499,22.5501085 12.1455487,22.4181909 C13.2427632,22.137436 14.1341281,21.5610933 14.569727,20.4318698 C14.8058273,19.8198265 14.8252702,19.1805423 14.7553538,18.5457701 C14.6243788,17.3564252 14.049337,16.4476659 12.9775822,15.898846 C12.2455487,15.5240738 11.4615933,15.3701041 10.6434318,15.3717397 C8.86170474,15.3754056 7.07992201,15.3743905 5.29819499,15.3752364 C5.20064624,15.3752928 5.10309749,15.3752364 5.00532591,15.3752364 L5.00532591,22.6189154 Z M-2.22841227e-05,1.05639913 C0.0918997214,1.04906725 0.183821727,1.03530586 0.275743733,1.03530586 C4.38811142,1.03423427 8.50064624,1.01483297 12.6128468,1.04370933 C14.3566908,1.05594794 15.9534039,1.58750976 17.2857159,2.77279393 C18.289727,3.66598698 18.8274986,4.82092842 18.9934596,6.15110195 C19.1255487,7.20977007 19.1405348,8.27238612 18.7982507,9.29800434 C18.309727,10.762013 17.2900056,11.7901128 16.0467744,12.6212668 C15.9464958,12.6883254 15.8433203,12.7509284 15.7418719,12.8162386 C15.7349081,12.8206941 15.7315655,12.8309588 15.7115655,12.8609631 C15.7948524,12.9065336 15.8771922,12.9532321 15.9609248,12.9971106 C17.7246017,13.9205336 19.0568022,15.2396529 19.6911755,17.1901605 C20.0373036,18.2544121 20.0478886,19.3505293 19.9286128,20.4487896 C19.8071086,21.5669024 19.5110641,22.6350456 18.9209805,23.6021779 C17.9583064,25.1798308 16.5213148,26.0933839 14.7984178,26.5977614 C13.8947967,26.8623861 12.9690028,26.9818959 12.0289471,26.9821779 C8.0836546,26.9831931 4.13836212,26.9822907 0.193069638,26.9829675 C0.128668524,26.9829675 0.0643788301,26.9940781 -2.22841227e-05,27 L-2.22841227e-05,1.05639913 Z" />
                    <path d="M52.8761086,27 C52.4437572,26.9297889 52.0086454,26.8732439 51.579441,26.7873197 C48.1598295,26.1033012 45.6059697,24.2086537 43.867013,21.1999795 C42.9265618,19.5728422 42.4035001,17.803623 42.1610719,15.9435553 C41.9961589,14.677709 41.9495063,13.4095943 42.0603132,12.1391557 C42.3370269,8.96549385 43.3016049,6.05895492 45.4491726,3.63730943 C47.1388819,1.73198361 49.2543172,0.580997951 51.7647266,0.163217213 C52.1160845,0.104790984 52.4688227,0.0542213115 52.8208983,0 L54.9188873,0 C55.2792445,0.0539446721 55.6400985,0.105122951 55.9999589,0.162165984 C59.7026332,0.748973361 62.3824828,2.71881148 64.0012469,6.11621926 C64.424102,7.00367828 64.7314574,7.9326332 64.9678124,8.94540984 L64.376566,8.94540984 C62.9689259,8.94546516 61.5612306,8.94186885 60.1535904,8.94989139 C59.9648818,8.95094262 59.8848822,8.88952869 59.8222738,8.71170492 C59.4873133,7.75995492 59.0469565,6.86297951 58.3752688,6.09818238 C57.4760597,5.07439549 56.332987,4.54490779 54.9875688,4.40620082 C53.1937331,4.22129508 51.5740856,4.61904713 50.1954309,5.82015984 C49.0149808,6.84864959 48.3023823,8.17602049 47.856891,9.65482377 C47.3296884,11.404623 47.2135813,13.1928197 47.3985908,15.0080164 C47.5492043,16.4861557 47.9056968,17.9024385 48.626356,19.2081209 C49.555489,20.8913607 50.8935091,22.072334 52.8174753,22.4613443 C55.9600419,23.0965635 58.5770622,21.457918 59.7771118,18.8203832 C60.070499,18.1755922 60.2736175,17.5031926 60.3879026,16.7762951 L54.4463981,16.7762951 L54.4463981,12.6581865 L65,12.6581865 L65,26.3763443 L60.9407779,26.3763443 C60.8702745,25.3011578 60.7997158,24.2260266 60.7256237,23.0962869 C60.4660251,23.439707 60.2579378,23.7409119 60.0239568,24.0203176 C58.6454677,25.6661004 56.922025,26.6958074 54.7695988,26.9515881 C54.7260931,26.9567889 54.6850719,26.9833463 54.6428361,27 L52.8761086,27 Z" />
                    <path d="M77.5149201,6.56214447 C76.4908492,10.1395978 75.4786317,13.675485 74.463043,17.2232161 L80.5484189,17.2232161 C79.534679,13.6602573 78.5280619,10.1227345 77.5149201,6.56214447 L77.5149201,6.56214447 Z M89.0000217,27.0000056 C88.4750998,26.9940273 87.9502865,26.9841575 87.4254189,26.9829167 C86.2656861,26.9803223 85.1057901,26.9714113 83.9464378,26.990305 C83.6844662,26.9945349 83.5898563,26.8955544 83.5105253,26.6595241 C82.9373196,24.9549731 82.3485087,23.256062 81.773835,21.5520187 C81.7105442,21.3643223 81.6310501,21.297715 81.4334567,21.298279 C78.7698066,21.306062 76.1061565,21.3075284 73.4425064,21.2964178 C73.2113645,21.295459 73.1351329,21.38378 73.0712983,21.5886217 C72.5333811,23.3147171 71.9845348,25.037203 71.4448232,26.7627909 C71.4004544,26.9047475 71.3550525,26.9857367 71.1911163,26.9851727 C69.5059721,26.979702 67.8207735,26.9816195 66.1356293,26.9805479 C66.1008846,26.9804915 66.06614,26.9701141 66.0063835,26.9605262 C66.0337877,26.8642529 66.0547759,26.7772855 66.0830501,26.6929688 C68.9169981,18.2384004 71.7524686,9.7843961 74.5808161,1.3278538 C74.6548184,1.1067128 74.7445348,1.02690803 74.9754047,1.0284308 C76.6605489,1.03948503 78.3457475,1.03971063 80.0308917,1.02820521 C80.2638279,1.02662603 80.3501187,1.11066074 80.4232511,1.32937657 C83.2383314,9.74119436 86.059991,18.1506434 88.8820856,26.5599232 C88.9133504,26.653151 88.9603291,26.740626 89.0000217,26.8308082 L89.0000217,27.0000056 Z" />
                    <polygon points="23 26 23 1 40.9962218 1 40.9962218 5.18048024 28.1107659 5.18048024 28.1107659 10.3558102 39.4689831 10.3558102 39.4689831 14.547773 28.1114676 14.547773 28.1114676 21.8273018 41 21.8273018 41 26" />
                  </g>
                </g>
              </g>
            </svg>
          </button>
        </div>
        {/* <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isLoading ? 'bg-bega-black animate-pulse' : 'bg-emerald-500'}`} />
          <span className="text-xs text-bega-text-3 tracking-wide">{isLoading ? 'Processing…' : 'Ready'}</span>
        </div> */}
      </header>

      {isEmpty ? (
        /* ── ChatGPT-style centered landing ──────────────────────────────── */
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16 bg-white">
          <div className="text-center mb-8">
            <h2 className="text-[28px] font-semibold text-bega-text-1 tracking-tight mb-2">
              What can I help you find?
            </h2>
            <p className="text-sm text-bega-text-3 max-w-sm leading-relaxed">
              Search BEGA luminaires, outdoor furniture, and complete lighting solutions.
            </p>
          </div>

          <div className="w-full max-w-2xl">
            <ChatInput
              onSend={sendMessage}
              isLoading={isLoading}
              onClear={handleNewChat}
              variant="hero"
            />

            {/* Suggestion pills */}
            <div className="flex flex-wrap gap-2 justify-center mt-5">
              {SUGGESTED_STARTERS.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="rounded-full border border-bega-border-2 bg-white
                             hover:bg-bega-bg-1 hover:border-bega-border-3
                             text-bega-text-2 hover:text-bega-text-1
                             text-xs px-4 py-2 transition-all duration-150 shadow-button"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── Active chat ─────────────────────────────────────────────────── */
        <>
          <div className="flex-1 overflow-y-auto py-4 space-y-1 bg-bega-bg-1">
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                sessionId={sessionId}
                onSuggestedAction={sendMessage}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="flex-shrink-0">
            <ChatInput
              onSend={sendMessage}
              isLoading={isLoading}
              onClear={handleNewChat}
            />
          </div>
        </>
      )}

      {/* Floating shortlist button + comparison drawer */}
      <ShortlistButton />
      <CompareDrawer />
    </div>
  );
}


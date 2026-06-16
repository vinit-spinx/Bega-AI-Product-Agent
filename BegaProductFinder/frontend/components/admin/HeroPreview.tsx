interface Props {
  title: string;
  description: string;
  backgroundImageUrl: string;
}

export default function HeroPreview({ title, description, backgroundImageUrl }: Props) {
  return (
    <div className="sticky top-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-bega-text-3 mb-3">
        Live Preview
      </p>

      <div className="rounded-2xl border border-bega-border-1 overflow-hidden shadow-sm">
        {/* Label bar */}
        <div className="bg-bega-bg-2 border-b border-bega-border-1 px-4 py-2 flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-bega-border-2" />
            <span className="w-2.5 h-2.5 rounded-full bg-bega-border-2" />
            <span className="w-2.5 h-2.5 rounded-full bg-bega-border-2" />
          </div>
          <span className="text-[10px] text-bega-text-3 ml-1">/chat — Hero Section</span>
        </div>

        {/* Hero mockup */}
        <div className="relative bg-[#F7F5F2] flex flex-col items-center justify-center px-8 py-10 min-h-[260px]">
          {/* Background image */}
          {backgroundImageUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={backgroundImageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity: 0.06, filter: 'grayscale(100%)' }}
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to bottom, rgba(247,245,242,0.95), rgba(247,245,242,0.98))' }}
              />
            </>
          )}

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center">
            {/* BEGA logo mini */}
            <svg width="48" height="15" viewBox="0 0 89 27" fill="none" className="mb-4">
              <g fill="#1A1A1A" fillRule="evenodd">
                <path d="M5.007,5.386 L5.007,11.272 C5.085,11.278 5.147,11.289 5.21,11.289 C6.935,11.289 8.661,11.304 10.387,11.284 C11.325,11.273 12.221,11.047 13.027,10.538 C13.776,10.064 14.208,9.391 14.226,8.477 C14.244,7.507 13.979,6.661 13.169,6.064 C12.45,5.534 11.617,5.374 10.753,5.371 C8.935,5.364 7.117,5.38 5.299,5.386 C5.208,5.387 5.118,5.386 5.007,5.386 Z M5.005,22.619 C5.102,22.625 5.183,22.635 5.265,22.635 C7.028,22.635 8.791,22.651 10.554,22.626 C11.086,22.618 11.63,22.55 12.146,22.418 C13.243,22.137 14.134,21.561 14.57,20.432 C14.806,19.82 14.825,19.181 14.755,18.546 C14.624,17.356 14.049,16.448 12.978,15.899 C12.246,15.524 11.462,15.37 10.643,15.372 C8.862,15.375 7.08,15.374 5.298,15.375 C5.201,15.375 5.103,15.375 5.005,15.375 Z M0,1.056 C0.092,1.049 0.184,1.035 0.276,1.035 C4.388,1.034 8.501,1.015 12.613,1.044 C14.357,1.056 15.953,1.588 17.286,2.773 C18.29,3.666 18.827,4.821 18.993,6.151 C19.126,7.21 19.141,8.272 18.798,9.298 C18.31,10.762 17.29,11.79 16.047,12.621 C15.946,12.688 15.843,12.751 15.742,12.816 C15.735,12.821 15.732,12.831 15.712,12.861 C15.795,12.907 15.877,12.953 15.961,12.997 C17.725,13.921 19.057,15.24 19.691,17.19 C20.037,18.254 20.048,19.351 19.929,20.449 C19.807,21.567 19.511,22.635 18.921,23.602 C17.958,25.18 16.521,26.093 14.798,26.598 C13.895,26.862 12.969,26.982 12.029,26.982 C8.084,26.983 4.138,26.982 0.193,26.983 Z"/>
                <path d="M52.876,27 C52.444,26.93 52.009,26.873 51.579,26.787 C48.16,26.103 45.606,24.209 43.867,21.2 C42.927,19.573 42.404,17.804 42.161,15.944 C41.996,14.678 41.95,13.41 42.06,12.139 C42.337,8.965 43.302,6.059 45.449,3.637 C47.139,1.732 49.254,0.581 51.765,0.163 C52.116,0.105 52.469,0.054 52.821,0 L54.919,0 C55.279,0.054 55.64,0.105 56,0.162 C59.703,0.749 62.382,2.719 64.001,6.116 C64.424,7.004 64.731,7.933 64.968,8.945 L60.154,8.95 C59.822,7.76 59.047,6.863 58.375,6.098 C57.476,5.074 56.333,4.545 54.988,4.406 C53.194,4.221 51.574,4.619 50.195,5.82 C49.015,6.849 48.302,8.176 47.857,9.655 C47.33,11.405 47.214,13.193 47.399,15.008 C47.549,16.486 47.906,17.902 48.626,19.208 C49.549,20.891 50.894,22.072 52.817,22.461 C55.96,23.097 58.577,21.458 59.777,18.82 C60.07,18.176 60.274,17.503 60.388,16.776 L54.446,16.776 L54.446,12.658 L65,12.658 L65,26.376 L60.941,26.376 C60.87,25.301 60.8,24.226 60.726,23.096 C60.466,23.44 60.258,23.741 60.024,24.02 C58.645,25.666 56.922,26.696 54.77,26.952 Z"/>
                <path d="M77.515,6.562 C76.491,10.14 75.479,13.675 74.463,17.223 L80.548,17.223 C79.535,13.66 78.528,10.123 77.515,6.562 Z M89,27 C87.95,26.984 86.265,26.98 83.946,26.99 C83.684,26.995 83.59,26.896 83.511,26.66 C82.937,24.955 82.349,23.256 81.774,21.552 C81.711,21.364 81.631,21.298 81.433,21.298 C78.77,21.306 76.106,21.308 73.443,21.296 C73.211,21.295 73.135,21.384 73.071,21.589 C72.533,23.315 71.985,25.037 71.445,26.763 C71.4,26.905 71.355,26.986 71.191,26.985 C69.506,26.98 67.821,26.982 66.136,26.981 C66.034,26.862 66.055,26.777 66.083,26.693 C68.917,18.238 71.752,9.784 74.581,1.328 C74.655,1.107 74.745,1.027 74.975,1.028 C76.661,1.039 78.346,1.04 80.031,1.028 C80.264,1.027 80.35,1.111 80.423,1.329 C83.238,9.741 86.06,18.151 88.882,26.56 Z"/>
                <polygon points="23 26 23 1 41 1 41 5.18 28.111 5.18 28.111 10.356 39.469 10.356 39.469 14.548 28.111 14.548 28.111 21.827 41 21.827 41 26"/>
              </g>
            </svg>

            <div className="w-8 h-px bg-bega-border-3 mb-4" />

            <h2
              className="text-[18px] font-normal text-bega-text-1 tracking-tight text-center leading-snug mb-2 transition-all"
              style={{ minHeight: '1.4em' }}
            >
              {title || (
                <span className="text-bega-text-3 italic text-[14px]">Hero title will appear here</span>
              )}
            </h2>

            <p className="text-[8.5px] text-bega-text-3 tracking-[0.18em] uppercase text-center max-w-xs leading-relaxed transition-all">
              {description || (
                <span className="italic normal-case tracking-normal text-[11px]">
                  Description will appear here
                </span>
              )}
            </p>

            {/* Simulated search bar */}
            <div className="mt-5 w-full max-w-[260px] h-9 rounded-xl bg-white border border-bega-border-2 shadow-sm flex items-center px-3 gap-2">
              <svg viewBox="0 0 16 16" fill="none" stroke="#B0ACA8" strokeWidth={1.4} className="w-3.5 h-3.5 flex-shrink-0">
                <circle cx="7" cy="7" r="4.5" />
                <path d="M11 11l2.5 2.5" />
              </svg>
              <span className="text-[10px] text-bega-text-3">Ask about BEGA products…</span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-bega-text-3 mt-2.5 text-center">
        Preview updates as you type
      </p>
    </div>
  );
}

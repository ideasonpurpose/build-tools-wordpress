import prettyHrtime from "pretty-hrtime";

/**
 * Format hrtime tuples or millisecond durations into a human string.
 * Accepts:
 * - [seconds, nanoseconds] (from process.hrtime())
 * - number (milliseconds, e.g. stats.endTime - stats.startTime)
 */
export const prettierHrtime = (hrtime) => {
  if (typeof hrtime === "number") {
    const secs = Math.floor(hrtime / 1000);
    const nsecs = Math.round((hrtime % 1000) * 1e6);
    hrtime = [secs, nsecs];
  }

  let timeString;
  const seconds = hrtime[1] > 5e6 ? " seconds" : " second";
  if (hrtime[0] > 60) {
    timeString = prettyHrtime(hrtime, { verbose: true })
      .replace(/\d+ (milli|micro|nano)seconds/gi, "")
      .trim();
  } else if (hrtime[1] > 5e6) {
    timeString = prettyHrtime(hrtime).replace(/ s$/, seconds);
  } else {
    timeString = prettyHrtime(hrtime);
  }
  return timeString;
};

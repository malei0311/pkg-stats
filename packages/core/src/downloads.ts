import https from 'https';
import { isValidRange, parseDate } from './date';

export interface DownloadDayItem {
  day: string;
  downloads: number;
}

export interface DownloadMonthItem {
  month: string;
  downloads: number;
}

type Processor = (items: DownloadDayItem[]) => any;
type DefaultProcessor = (items: DownloadDayItem[]) => DownloadDayItem[];

export const DEFAULT_URL_PREFIX = 'https://api.npmjs.org/downloads/range';

export function identity<T>(o: T) {
  return o;
}

function patchEmpty(items: DownloadDayItem[], startDate: string, endDate: string) {
  const cache: Record<string, number> = {};
  items.forEach((item) => {
    cache[item.day] = item.downloads;
  });
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const result: DownloadDayItem[] = [];
  while (start <= end) {
    const day = start.toISOString().slice(0, 10);
    result.push({
      day,
      downloads: cache[day] || 0,
    });
    start.setDate(start.getDate() + 1);
  }
  return result;
}

export function monthly(downloadItems: DownloadDayItem[]) {
  const cache: Record<string, DownloadMonthItem> = {};
  downloadItems.forEach((item) => {
    const month = item.day.slice(0, 7);
    if (!cache[month]) {
      cache[month] = {
        month,
        downloads: 0,
      };
    }
    cache[month].downloads += item.downloads;
  });
  return Object.values(cache);
}

export function get<P extends Processor = DefaultProcessor>(
  startDate: string,
  endDate: string,
  pkgName: string,
  processor: P = identity as P,
  urlPrefix = DEFAULT_URL_PREFIX,
) {
  if (!isValidRange(startDate, endDate)) {
    throw new Error('Invalid date range');
  }
  return new Promise<ReturnType<P>>((resolve, reject) => {
    const url = `${urlPrefix}/${startDate}:${endDate}/${pkgName}`;
    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const items = (JSON.parse(data).downloads || []) as DownloadDayItem[];
            resolve(processor(patchEmpty(items, startDate, endDate)));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

export function getGetter<P extends Processor = DefaultProcessor>(
  startDate: string,
  endDate: string,
  processor: P = identity as P,
  urlPrefix = DEFAULT_URL_PREFIX,
) {
  return (pkgName: string) => {
    return get(startDate, endDate, pkgName, processor, urlPrefix);
  };
}

export function getMultiPrefixGetter<P extends Processor = DefaultProcessor>(
  startDate: string,
  endDate: string,
  processor: P = identity as P,
  urlPrefixes = [DEFAULT_URL_PREFIX],
) {
  return (pkgName: string) => {
    const promises = urlPrefixes.map((urlPrefix) =>
      get(startDate, endDate, pkgName, processor, urlPrefix),
    );
    return Promise.all(promises);
  };
}

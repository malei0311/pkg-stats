import { downloads, date } from '@pkg-stats/core';
// @ts-expect-error
import ervy from 'ervy';
import pc from 'picocolors';

/* eslint-disable no-console */
interface StartEndDate {
  startDate: string;
  endDate: string;
}

interface GetDownloadsStatsOptions extends Partial<StartEndDate> {
  packageNames: string[];
  urlPrefixes?: string[] | boolean;
  merge?: boolean;
}

function getDefaultStartEndDate(): StartEndDate {
  const end = new Date();
  const lastOfMonth = new Date(Date.UTC(end.getFullYear(), end.getMonth() + 1, 0));
  const endDateStr = lastOfMonth.toISOString().slice(0, 10);
  const start = new Date(lastOfMonth.getTime() - 170 * 24 * 60 * 60 * 1000);
  const firstOfMonth = new Date(Date.UTC(start.getFullYear(), start.getMonth(), 1));
  return {
    startDate: firstOfMonth.toISOString().slice(0, 10),
    endDate: endDateStr,
  };
}

function parseStartEndDate(startDate?: string, endDate?: string): StartEndDate {
  try {
    if (date.isValidRange(startDate, endDate)) {
      return { startDate: startDate as string, endDate: endDate as string };
    }
    return getDefaultStartEndDate();
  } catch (err) {
    // ignore
  }
  return getDefaultStartEndDate();
}

function getChartItemKey(item: downloads.DownloadDayItem | downloads.DownloadMonthItem) {
  return (
    (item as downloads.DownloadMonthItem).month || (item as downloads.DownloadDayItem).day.slice(5)
  );
}

// 兼容 picocolors 和 ervy 的颜色
type Color = 'cyan' | 'magenta' | 'blue' | 'green' | 'red' | 'yellow';

interface BarChartItem {
  key: string;
  value: number;
}

interface BarChartOptions {
  barWidth?: number;
  left?: number;
  height?: number;
  padding?: number;
  style?: string;
}

interface DrawChartOptions extends BarChartOptions {
  pkgName: string;
  urlPrefixes: string[];
  isMerge?: boolean;
}

function getColor(index: number) {
  const colors: Color[] = ['cyan', 'magenta', 'blue', 'green', 'red', 'yellow'];
  return colors[index % colors.length];
}

function drawChart(
  registryItems: (downloads.DownloadMonthItem[] | downloads.DownloadDayItem[])[],
  options: DrawChartOptions,
) {
  const { pkgName, urlPrefixes = [], isMerge, ...rest } = options;
  console.log(pc.dim('\n-----------------------------------\n'));
  console.log(pc.bold('packageName: '), pc.bold(pc.cyan(pkgName)), '\n');
  const defaultBarChartOptions: Required<BarChartOptions> = {
    padding: 6,
    style: ervy.bg(getColor(0)),
    height: 10,
    barWidth: 3,
    left: 0,
    ...rest,
  };

  const getBarWidth = (maxNumber: number) => {
    const barWidth = `${maxNumber || 0}`.length;
    return barWidth > defaultBarChartOptions.barWidth ? barWidth : defaultBarChartOptions.barWidth;
  };

  if (isMerge) {
    const urlPrefix = urlPrefixes
      .map((url, idx) => {
        return pc[getColor(idx)](url);
      })
      .join('\n    ');
    let total = 0;
    const mergedData = registryItems.reduce((acc: BarChartItem[], cur) => {
      cur.forEach((item, idx) => {
        total += item.downloads;
        if (!acc[idx]) {
          acc[idx] = {
            key: getChartItemKey(item),
            value: item.downloads,
          };
        } else {
          acc[idx].value += item.downloads;
        }
      });
      return acc;
    }, []);

    const maxNum = Math.max.apply(
      null,
      mergedData.map((item) => item.value),
    );
    const barChartOptions: BarChartOptions = {
      ...defaultBarChartOptions,
      barWidth: getBarWidth(maxNum),
    };

    console.log(`\nurlPrefix: \n    ${urlPrefix}\ntotal: `, pc.bold(pc.cyan(total)));
    console.log(ervy.bar(mergedData, barChartOptions));
    return;
  }

  registryItems.forEach((registryItem, idx) => {
    let total = 0;
    let maxNum = 0;
    const data: BarChartItem[] = registryItem.map((item) => {
      total += item.downloads;
      if (item.downloads > maxNum) {
        maxNum = item.downloads;
      }
      return {
        key: getChartItemKey(item),
        value: item.downloads,
      };
    });
    const barChartOptions: BarChartOptions = {
      ...defaultBarChartOptions,
      style: ervy.bg(getColor(idx)),
      barWidth: getBarWidth(maxNum),
    };
    console.log(
      '\nurlPrefix: ',
      pc[getColor(idx)](urlPrefixes[idx]),
      '\ntotal: ',
      pc.bold(pc[getColor(idx)](total)),
    );
    console.log(ervy.bar(data, barChartOptions));
  });
}

export function getDownloadsStats(options: GetDownloadsStatsOptions) {
  const {
    startDate: rawStartDate,
    endDate: rawEndDate,
    packageNames,
    urlPrefixes: rawUrlPrefixes,
    merge = false,
  } = options;
  let urlPrefixes: string[] = [downloads.DEFAULT_URL_PREFIX];
  if (Array.isArray(rawUrlPrefixes) && rawUrlPrefixes.length) {
    urlPrefixes = rawUrlPrefixes;
  }
  const { startDate, endDate } = parseStartEndDate(rawStartDate, rawEndDate);
  const isLessThanOneMonth = date.isValidRange(startDate, endDate, 31 * 24 * 60 * 60 * 1000);
  const getter = downloads.getMultiPrefixGetter(
    startDate,
    endDate,
    isLessThanOneMonth ? downloads.identity : downloads.monthly,
    urlPrefixes,
  );
  return Promise.all(packageNames.map((packageName) => getter(packageName))).then(
    (multiRegistryPkg) => {
      multiRegistryPkg.forEach((registryItems, index) => {
        drawChart(registryItems, {
          pkgName: packageNames[index],
          urlPrefixes,
          isMerge: merge,
          padding: isLessThanOneMonth ? 3 : 6,
          left: 0,
        });
      });
      return multiRegistryPkg;
    },
  );
}
/* eslint-enable no-console */

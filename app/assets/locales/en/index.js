// 英文字典總表（主代理維護）。各區字典檔各有一位負責人，這裡只負責合併。
// key 是繁中原句；值是英文，或 {one, other} 單複數。後面的檔案同 key 會覆蓋前面的。
import common from './common.js?v=i18n1';
import bundle from './bundle.js?v=i18n1';
import records from './records.js?v=audit1117';
import care from './care.js?v=uxfull1';
import play from './play.js?v=audit1117';
import settings from './settings.js?v=audit1117';
import native from './native.js?v=i18n1';
import ios from './ios.js?v=i18n1';
import voice from './voice.js?v=i18n1';
import images from './images.js?v=i18n1';
import data from './data.js?v=i18n1';
import doses from './doses.js?v=1';
import diary from './diary.js?v=audit1117';
import diaryShare from './diary-share.js?v=1';
import audit6Diary from './audit6-diary.js?v=1';
import audit1117 from './audit-1117.js?v=audit1117b';

export default Object.freeze({...common, ...bundle, ...records, ...care, ...play, ...settings, ...native, ...ios, ...voice, ...images, ...data, ...doses,...diary,...diaryShare,...audit6Diary,...audit1117});

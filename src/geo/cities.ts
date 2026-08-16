import { CityEntry } from '../types';

export const CITIES_DATABASE: CityEntry[] = [
  // ── 中国直辖市与特别行政区 ──
  { name: 'Beijing', chineseName: '北京', pinyin: 'beijing', country: 'CN', province: 'Beijing', longitude: 116.4074, latitude: 39.9042, timezone: 'Asia/Shanghai', aliases: ['北京市', '京', 'Peking'] },
  { name: 'Shanghai', chineseName: '上海', pinyin: 'shanghai', country: 'CN', province: 'Shanghai', longitude: 121.4737, latitude: 31.2304, timezone: 'Asia/Shanghai', aliases: ['上海市', '沪'] },
  { name: 'Tianjin', chineseName: '天津', pinyin: 'tianjin', country: 'CN', province: 'Tianjin', longitude: 117.2008, latitude: 39.0842, timezone: 'Asia/Shanghai', aliases: ['天津市', '津'] },
  { name: 'Chongqing', chineseName: '重庆', pinyin: 'chongqing', country: 'CN', province: 'Chongqing', longitude: 106.5516, latitude: 29.5630, timezone: 'Asia/Shanghai', aliases: ['重庆市', '渝'] },
  { name: 'Hong Kong', chineseName: '香港', pinyin: 'xianggang', country: 'CN', province: 'Hong Kong', longitude: 114.1694, latitude: 22.3193, timezone: 'Asia/Hong_Kong', aliases: ['香港特别行政区', 'HK'] },
  { name: 'Macau', chineseName: '澳门', pinyin: 'aomen', country: 'CN', province: 'Macau', longitude: 113.5439, latitude: 22.1987, timezone: 'Asia/Macau', aliases: ['澳门特别行政区', 'Macao'] },
  { name: 'Taipei', chineseName: '台北', pinyin: 'taibei', country: 'TW', province: 'Taiwan', longitude: 121.5654, latitude: 25.0330, timezone: 'Asia/Taipei', aliases: ['台北市'] },
  { name: 'Kaohsiung', chineseName: '高雄', pinyin: 'gaoxiong', country: 'TW', province: 'Taiwan', longitude: 120.3014, latitude: 22.6273, timezone: 'Asia/Taipei', aliases: ['高雄市'] },

  // ── 中国各省省会与主要城市 ──
  // 广东
  { name: 'Guangzhou', chineseName: '广州', pinyin: 'guangzhou', country: 'CN', province: 'Guangdong', longitude: 113.2644, latitude: 23.1291, timezone: 'Asia/Shanghai', aliases: ['广州市', '穗', 'Canton'] },
  { name: 'Shenzhen', chineseName: '深圳', pinyin: 'shenzhen', country: 'CN', province: 'Guangdong', longitude: 114.0579, latitude: 22.5431, timezone: 'Asia/Shanghai', aliases: ['深圳市'] },
  { name: 'Dongguan', chineseName: '东莞', pinyin: 'dongguan', country: 'CN', province: 'Guangdong', longitude: 113.7518, latitude: 23.0207, timezone: 'Asia/Shanghai', aliases: ['东莞市'] },
  { name: 'Foshan', chineseName: '佛山', pinyin: 'foshan', country: 'CN', province: 'Guangdong', longitude: 113.1214, latitude: 23.0215, timezone: 'Asia/Shanghai', aliases: ['佛山市'] },
  { name: 'Zhuhai', chineseName: '珠海', pinyin: 'zhuhai', country: 'CN', province: 'Guangdong', longitude: 113.5767, latitude: 22.2707, timezone: 'Asia/Shanghai', aliases: ['珠海市'] },
  { name: 'Shantou', chineseName: '汕头', pinyin: 'shantou', country: 'CN', province: 'Guangdong', longitude: 116.6820, latitude: 23.3541, timezone: 'Asia/Shanghai', aliases: ['汕头市', 'Swatow'] },
  { name: 'Zhongshan', chineseName: '中山', pinyin: 'zhongshan', country: 'CN', province: 'Guangdong', longitude: 113.3928, latitude: 22.5171, timezone: 'Asia/Shanghai', aliases: ['中山市'] },
  { name: 'Huizhou', chineseName: '惠州', pinyin: 'huizhou', country: 'CN', province: 'Guangdong', longitude: 114.4162, latitude: 23.1118, timezone: 'Asia/Shanghai', aliases: ['惠州市'] },
  { name: 'Zhanjiang', chineseName: '湛江', pinyin: 'zhanjiang', country: 'CN', province: 'Guangdong', longitude: 110.3594, latitude: 21.2707, timezone: 'Asia/Shanghai', aliases: ['湛江市'] },

  // 浙江
  { name: 'Hangzhou', chineseName: '杭州', pinyin: 'hangzhou', country: 'CN', province: 'Zhejiang', longitude: 120.1551, latitude: 30.2741, timezone: 'Asia/Shanghai', aliases: ['杭州市', '杭'] },
  { name: 'Ningbo', chineseName: '宁波', pinyin: 'ningbo', country: 'CN', province: 'Zhejiang', longitude: 121.5498, latitude: 29.8683, timezone: 'Asia/Shanghai', aliases: ['宁波市', '甬'] },
  { name: 'Wenzhou', chineseName: '温州', pinyin: 'wenzhou', country: 'CN', province: 'Zhejiang', longitude: 120.6994, latitude: 27.9943, timezone: 'Asia/Shanghai', aliases: ['温州市'] },
  { name: 'Jiaxing', chineseName: '嘉兴', pinyin: 'jiaxing', country: 'CN', province: 'Zhejiang', longitude: 120.7555, latitude: 30.7461, timezone: 'Asia/Shanghai', aliases: ['嘉兴市'] },
  { name: 'Shaoxing', chineseName: '绍兴', pinyin: 'shaoxing', country: 'CN', province: 'Zhejiang', longitude: 120.5802, latitude: 29.9959, timezone: 'Asia/Shanghai', aliases: ['绍兴市'] },
  { name: 'Jinhua', chineseName: '金华', pinyin: 'jinhua', country: 'CN', province: 'Zhejiang', longitude: 119.6474, latitude: 29.0791, timezone: 'Asia/Shanghai', aliases: ['金华市', '义乌', 'Yiwu'] },

  // 江苏
  { name: 'Nanjing', chineseName: '南京', pinyin: 'nanjing', country: 'CN', province: 'Jiangsu', longitude: 118.7969, latitude: 32.0603, timezone: 'Asia/Shanghai', aliases: ['南京市', '宁', 'Nankin'] },
  { name: 'Suzhou', chineseName: '苏州', pinyin: 'suzhou', country: 'CN', province: 'Jiangsu', longitude: 120.5853, latitude: 31.2990, timezone: 'Asia/Shanghai', aliases: ['苏州市', '姑苏'] },
  { name: 'Wuxi', chineseName: '无锡', pinyin: 'wuxi', country: 'CN', province: 'Jiangsu', longitude: 120.3119, latitude: 31.4912, timezone: 'Asia/Shanghai', aliases: ['无锡市'] },
  { name: 'Changzhou', chineseName: '常州', pinyin: 'changzhou', country: 'CN', province: 'Jiangsu', longitude: 119.9740, latitude: 31.8112, timezone: 'Asia/Shanghai', aliases: ['常州市'] },
  { name: 'Nantong', chineseName: '南通', pinyin: 'nantong', country: 'CN', province: 'Jiangsu', longitude: 120.8943, latitude: 31.9802, timezone: 'Asia/Shanghai', aliases: ['南通市'] },
  { name: 'Xuzhou', chineseName: '徐州', pinyin: 'xuzhou', country: 'CN', province: 'Jiangsu', longitude: 117.1848, latitude: 34.2618, timezone: 'Asia/Shanghai', aliases: ['徐州市', '彭城'] },
  { name: 'Yangzhou', chineseName: '扬州', pinyin: 'yangzhou', country: 'CN', province: 'Jiangsu', longitude: 119.4129, latitude: 32.3942, timezone: 'Asia/Shanghai', aliases: ['扬州市'] },

  // 四川 & 重庆
  { name: 'Chengdu', chineseName: '成都', pinyin: 'chengdu', country: 'CN', province: 'Sichuan', longitude: 104.0665, latitude: 30.5723, timezone: 'Asia/Shanghai', aliases: ['成都市', '蓉'] },
  { name: 'Mianyang', chineseName: '绵阳', pinyin: 'mianyang', country: 'CN', province: 'Sichuan', longitude: 104.6791, latitude: 31.4675, timezone: 'Asia/Shanghai', aliases: ['绵阳市'] },

  // 湖北 & 湖南
  { name: 'Wuhan', chineseName: '武汉', pinyin: 'wuhan', country: 'CN', province: 'Hubei', longitude: 114.3055, latitude: 30.5928, timezone: 'Asia/Shanghai', aliases: ['武汉市', '汉', '武昌', '汉口', '汉阳'] },
  { name: 'Changsha', chineseName: '长沙', pinyin: 'changsha', country: 'CN', province: 'Hunan', longitude: 112.9388, latitude: 28.2282, timezone: 'Asia/Shanghai', aliases: ['长沙市', '星城'] },

  // 陕西
  { name: 'Xi\'an', chineseName: '西安', pinyin: 'xian', country: 'CN', province: 'Shaanxi', longitude: 108.9398, latitude: 34.3416, timezone: 'Asia/Shanghai', aliases: ['西安市', '长安', 'Xian'] },

  // 新疆
  { name: 'Urumqi', chineseName: '乌鲁木齐', pinyin: 'wulumuqi', country: 'CN', province: 'Xinjiang', longitude: 87.6168, latitude: 43.8256, timezone: 'Asia/Shanghai', aliases: ['乌鲁木齐市', '迪化'] },
  { name: 'Kashgar', chineseName: '喀什', pinyin: 'kashi', country: 'CN', province: 'Xinjiang', longitude: 75.9898, latitude: 39.4704, timezone: 'Asia/Shanghai', aliases: ['喀什市', '喀什地区'] },
  { name: 'Yining', chineseName: '伊宁', pinyin: 'yining', country: 'CN', province: 'Xinjiang', longitude: 81.3242, latitude: 43.9169, timezone: 'Asia/Shanghai', aliases: ['伊宁市', '伊犁'] },
  { name: 'Korla', chineseName: '库尔勒', pinyin: 'kuerle', country: 'CN', province: 'Xinjiang', longitude: 86.1747, latitude: 41.7259, timezone: 'Asia/Shanghai', aliases: ['库尔勒市'] },

  // 西藏
  { name: 'Lhasa', chineseName: '拉萨', pinyin: 'lasa', country: 'CN', province: 'Tibet', longitude: 91.1172, latitude: 29.6469, timezone: 'Asia/Shanghai', aliases: ['拉萨市'] },

  // 福建
  { name: 'Fuzhou', chineseName: '福州', pinyin: 'fuzhou', country: 'CN', province: 'Fujian', longitude: 119.2965, latitude: 26.0745, timezone: 'Asia/Shanghai', aliases: ['福州市', '榕'] },
  { name: 'Xiamen', chineseName: '厦门', pinyin: 'xiamen', country: 'CN', province: 'Fujian', longitude: 118.0894, latitude: 24.4798, timezone: 'Asia/Shanghai', aliases: ['厦门市', '鹭岛', 'Amoy'] },
  { name: 'Quanzhou', chineseName: '泉州', pinyin: 'quanzhou', country: 'CN', province: 'Fujian', longitude: 118.6757, latitude: 24.8741, timezone: 'Asia/Shanghai', aliases: ['泉州市'] },

  // 山东
  { name: 'Jinan', chineseName: '济南', pinyin: 'jinan', country: 'CN', province: 'Shandong', longitude: 117.1205, latitude: 36.6512, timezone: 'Asia/Shanghai', aliases: ['济南市', '泉城'] },
  { name: 'Qingdao', chineseName: '青岛', pinyin: 'qingdao', country: 'CN', province: 'Shandong', longitude: 120.3826, latitude: 36.0671, timezone: 'Asia/Shanghai', aliases: ['青岛市', 'Tsingtao'] },
  { name: 'Yantai', chineseName: '烟台', pinyin: 'yantai', country: 'CN', province: 'Shandong', longitude: 121.4479, latitude: 37.4638, timezone: 'Asia/Shanghai', aliases: ['烟台市'] },

  // 辽宁 & 吉林 & 黑龙江
  { name: 'Shenyang', chineseName: '沈阳', pinyin: 'shenyang', country: 'CN', province: 'Liaoning', longitude: 123.4315, latitude: 41.8057, timezone: 'Asia/Shanghai', aliases: ['沈阳市', '盛京', '奉天', 'Mukden'] },
  { name: 'Dalian', chineseName: '大连', pinyin: 'dalian', country: 'CN', province: 'Liaoning', longitude: 121.6147, latitude: 38.9140, timezone: 'Asia/Shanghai', aliases: ['大连市'] },
  { name: 'Changchun', chineseName: '长春', pinyin: 'changchun', country: 'CN', province: 'Jilin', longitude: 125.3235, latitude: 43.8171, timezone: 'Asia/Shanghai', aliases: ['长春市'] },
  { name: 'Harbin', chineseName: '哈尔滨', pinyin: 'haerbin', country: 'CN', province: 'Heilongjiang', longitude: 126.5350, latitude: 45.8038, timezone: 'Asia/Shanghai', aliases: ['哈尔滨市'] },

  // 河南 & 河北 & 山西 & 安徽 & 江西
  { name: 'Zhengzhou', chineseName: '郑州', pinyin: 'zhengzhou', country: 'CN', province: 'Henan', longitude: 113.6254, latitude: 34.7466, timezone: 'Asia/Shanghai', aliases: ['郑州市'] },
  { name: 'Luoyang', chineseName: '洛阳', pinyin: 'luoyang', country: 'CN', province: 'Henan', longitude: 112.4540, latitude: 34.6197, timezone: 'Asia/Shanghai', aliases: ['洛阳市'] },
  { name: 'Shijiazhuang', chineseName: '石家庄', pinyin: 'shijiazhuang', country: 'CN', province: 'Hebei', longitude: 114.5149, latitude: 38.0428, timezone: 'Asia/Shanghai', aliases: ['石家庄市'] },
  { name: 'Taiyuan', chineseName: '太原', pinyin: 'taiyuan', country: 'CN', province: 'Shanxi', longitude: 112.5489, latitude: 37.8706, timezone: 'Asia/Shanghai', aliases: ['太原市', '并州'] },
  { name: 'Hefei', chineseName: '合肥', pinyin: 'hefei', country: 'CN', province: 'Anhui', longitude: 117.2272, latitude: 31.8206, timezone: 'Asia/Shanghai', aliases: ['合肥市', '庐州'] },
  { name: 'Nanchang', chineseName: '南昌', pinyin: 'nanchang', country: 'CN', province: 'Jiangxi', longitude: 115.8579, latitude: 28.6830, timezone: 'Asia/Shanghai', aliases: ['南昌市', '洪城'] },

  // 云南 & 贵州 & 广西 & 海南 & 甘肃 & 宁夏 & 青海 & 内蒙古
  { name: 'Kunming', chineseName: '昆明', pinyin: 'kunming', country: 'CN', province: 'Yunnan', longitude: 102.8329, latitude: 24.8801, timezone: 'Asia/Shanghai', aliases: ['昆明市', '春城'] },
  { name: 'Guiyang', chineseName: '贵阳', pinyin: 'guiyang', country: 'CN', province: 'Guizhou', longitude: 106.6302, latitude: 26.6477, timezone: 'Asia/Shanghai', aliases: ['贵阳市', '筑城'] },
  { name: 'Nanning', chineseName: '南宁', pinyin: 'nanning', country: 'CN', province: 'Guangxi', longitude: 108.3665, latitude: 22.8170, timezone: 'Asia/Shanghai', aliases: ['南宁市', '绿城', '邕城'] },
  { name: 'Guilin', chineseName: '桂林', pinyin: 'guilin', country: 'CN', province: 'Guangxi', longitude: 110.2902, latitude: 25.2736, timezone: 'Asia/Shanghai', aliases: ['桂林市'] },
  { name: 'Haikou', chineseName: '海口', pinyin: 'haikou', country: 'CN', province: 'Hainan', longitude: 110.3312, latitude: 20.0319, timezone: 'Asia/Shanghai', aliases: ['海口市', '椰城'] },
  { name: 'Sanya', chineseName: '三亚', pinyin: 'sanya', country: 'CN', province: 'Hainan', longitude: 109.5119, latitude: 18.2528, timezone: 'Asia/Shanghai', aliases: ['三亚市'] },
  { name: 'Lanzhou', chineseName: '兰州', pinyin: 'lanzhou', country: 'CN', province: 'Gansu', longitude: 103.8343, latitude: 36.0611, timezone: 'Asia/Shanghai', aliases: ['兰州市', '金城'] },
  { name: 'Yinchuan', chineseName: '银川', pinyin: 'yinchuan', country: 'CN', province: 'Ningxia', longitude: 106.2309, latitude: 38.4872, timezone: 'Asia/Shanghai', aliases: ['银川市'] },
  { name: 'Xining', chineseName: '西宁', pinyin: 'xining', country: 'CN', province: 'Qinghai', longitude: 101.7782, latitude: 36.6231, timezone: 'Asia/Shanghai', aliases: ['西宁市'] },
  { name: 'Hohhot', chineseName: '呼和浩特', pinyin: 'huhehaote', country: 'CN', province: 'Inner Mongolia', longitude: 111.7492, latitude: 40.8426, timezone: 'Asia/Shanghai', aliases: ['呼市', '青城'] },

  // ── 北美主要城市 ──
  { name: 'Tacoma', chineseName: '塔科马', country: 'US', province: 'WA', longitude: -122.4443, latitude: 47.2529, timezone: 'America/Los_Angeles', aliases: ['Tacoma, WA', 'Tacoma WA', '塔科马市'] },
  { name: 'Seattle', chineseName: '西雅图', country: 'US', province: 'WA', longitude: -122.3321, latitude: 47.6062, timezone: 'America/Los_Angeles', aliases: ['Seattle, WA', 'Seattle WA', '西雅图市'] },
  { name: 'San Francisco', chineseName: '旧金山', country: 'US', province: 'CA', longitude: -122.4194, latitude: 37.7749, timezone: 'America/Los_Angeles', aliases: ['San Francisco, CA', '三藩市', '圣弗朗西斯科', 'SF'] },
  { name: 'Los Angeles', chineseName: '洛杉矶', country: 'US', province: 'CA', longitude: -118.2437, latitude: 34.0522, timezone: 'America/Los_Angeles', aliases: ['Los Angeles, CA', 'LA', '洛城'] },
  { name: 'San Jose', chineseName: '圣何塞', country: 'US', province: 'CA', longitude: -121.8863, latitude: 37.3382, timezone: 'America/Los_Angeles', aliases: ['San Jose, CA', '硅谷', '圣荷西'] },
  { name: 'San Diego', chineseName: '圣地亚哥', country: 'US', province: 'CA', longitude: -117.1611, latitude: 32.7157, timezone: 'America/Los_Angeles', aliases: ['San Diego, CA', '圣迭戈'] },
  { name: 'New York', chineseName: '纽约', country: 'US', province: 'NY', longitude: -74.0060, latitude: 40.7128, timezone: 'America/New_York', aliases: ['New York, NY', 'NYC', '纽约市'] },
  { name: 'Boston', chineseName: '波士顿', country: 'US', province: 'MA', longitude: -71.0589, latitude: 42.3601, timezone: 'America/New_York', aliases: ['Boston, MA'] },
  { name: 'Chicago', chineseName: '芝加哥', country: 'US', province: 'IL', longitude: -87.6298, latitude: 41.8781, timezone: 'America/Chicago', aliases: ['Chicago, IL'] },
  { name: 'Houston', chineseName: '休斯敦', country: 'US', province: 'TX', longitude: -95.3698, latitude: 29.7604, timezone: 'America/Chicago', aliases: ['Houston, TX', '休斯顿'] },
  { name: 'Austin', chineseName: '奥斯汀', country: 'US', province: 'TX', longitude: -97.7431, latitude: 30.2672, timezone: 'America/Chicago', aliases: ['Austin, TX'] },
  { name: 'Dallas', chineseName: '达拉斯', country: 'US', province: 'TX', longitude: -96.7970, latitude: 32.7767, timezone: 'America/Chicago', aliases: ['Dallas, TX'] },
  { name: 'Atlanta', chineseName: '亚特兰大', country: 'US', province: 'GA', longitude: -84.3880, latitude: 33.7490, timezone: 'America/New_York', aliases: ['Atlanta, GA'] },
  { name: 'Miami', chineseName: '迈阿密', country: 'US', province: 'FL', longitude: -80.1918, latitude: 25.7617, timezone: 'America/New_York', aliases: ['Miami, FL'] },
  { name: 'Washington D.C.', chineseName: '华盛顿', country: 'US', province: 'DC', longitude: -77.0369, latitude: 38.9072, timezone: 'America/New_York', aliases: ['Washington, DC', 'Washington DC', '华盛顿特区'] },
  { name: 'Denver', chineseName: '丹佛', country: 'US', province: 'CO', longitude: -104.9903, latitude: 39.7392, timezone: 'America/Denver', aliases: ['Denver, CO'] },
  { name: 'Phoenix', chineseName: '菲尼克斯', country: 'US', province: 'AZ', longitude: -112.0740, latitude: 33.4484, timezone: 'America/Phoenix', aliases: ['Phoenix, AZ', '凤凰城'] },
  { name: 'Honolulu', chineseName: '檀香山', country: 'US', province: 'HI', longitude: -157.8583, latitude: 21.3069, timezone: 'Pacific/Honolulu', aliases: ['Honolulu, HI', '火奴鲁鲁'] },

  // 加拿大
  { name: 'Vancouver', chineseName: '温哥华', country: 'CA', province: 'BC', longitude: -123.1207, latitude: 49.2827, timezone: 'America/Vancouver', aliases: ['Vancouver, BC'] },
  { name: 'Toronto', chineseName: '多伦多', country: 'CA', province: 'ON', longitude: -79.3832, latitude: 43.6532, timezone: 'America/Toronto', aliases: ['Toronto, ON'] },
  { name: 'Montreal', chineseName: '蒙特利尔', country: 'CA', province: 'QC', longitude: -73.5673, latitude: 45.5017, timezone: 'America/Toronto', aliases: ['Montreal, QC', '满地可'] },
  { name: 'Calgary', chineseName: '卡尔加里', country: 'CA', province: 'AB', longitude: -114.0719, latitude: 51.0447, timezone: 'America/Edmonton', aliases: ['Calgary, AB'] },
  { name: 'St. John\'s', chineseName: '圣约翰斯', country: 'CA', province: 'NL', longitude: -52.7126, latitude: 47.5615, timezone: 'America/St_Johns', aliases: ['St Johns', '纽芬兰'] },

  // 欧洲主要城市
  { name: 'London', chineseName: '伦敦', country: 'GB', longitude: -0.1278, latitude: 51.5074, timezone: 'Europe/London', aliases: ['伦敦市'] },
  { name: 'Paris', chineseName: '巴黎', country: 'FR', longitude: 2.3522, latitude: 48.8566, timezone: 'Europe/Paris', aliases: ['巴黎市'] },
  { name: 'Berlin', chineseName: '柏林', country: 'DE', longitude: 13.4050, latitude: 52.5200, timezone: 'Europe/Berlin', aliases: ['柏林市'] },
  { name: 'Frankfurt', chineseName: '法兰克福', country: 'DE', longitude: 8.6821, latitude: 50.1109, timezone: 'Europe/Berlin', aliases: [] },
  { name: 'Rome', chineseName: '罗马', country: 'IT', longitude: 12.4964, latitude: 41.9028, timezone: 'Europe/Rome', aliases: ['罗马市'] },
  { name: 'Madrid', chineseName: '马德里', country: 'ES', longitude: -3.7038, latitude: 40.4168, timezone: 'Europe/Madrid', aliases: [] },
  { name: 'Amsterdam', chineseName: '阿姆斯特丹', country: 'NL', longitude: 4.9041, latitude: 52.3676, timezone: 'Europe/Amsterdam', aliases: [] },
  { name: 'Moscow', chineseName: '莫斯科', country: 'RU', longitude: 37.6173, latitude: 55.7558, timezone: 'Europe/Moscow', aliases: ['Moscow, RU', '莫斯科市'] },
  { name: 'Vladivostok', chineseName: '符拉迪沃斯托克', country: 'RU', longitude: 131.8853, latitude: 43.1155, timezone: 'Asia/Vladivostok', aliases: ['海参崴'] },
  { name: 'Reykjavik', chineseName: '雷克雅未克', country: 'IS', longitude: -21.9426, latitude: 64.1466, timezone: 'Atlantic/Reykjavik', aliases: [] },

  // 亚太与中东主要城市
  { name: 'Tokyo', chineseName: '东京', country: 'JP', longitude: 139.6917, latitude: 35.6895, timezone: 'Asia/Tokyo', aliases: ['东京都', 'とうきょう'] },
  { name: 'Osaka', chineseName: '大阪', country: 'JP', longitude: 135.5023, latitude: 34.6937, timezone: 'Asia/Tokyo', aliases: ['大阪市'] },
  { name: 'Seoul', chineseName: '首尔', country: 'KR', longitude: 126.9780, latitude: 37.5665, timezone: 'Asia/Seoul', aliases: ['汉城', '서울'] },
  { name: 'Singapore', chineseName: '新加坡', country: 'SG', longitude: 103.8198, latitude: 1.3521, timezone: 'Asia/Singapore', aliases: ['狮城', '新加坡市'] },
  { name: 'Kuala Lumpur', chineseName: '吉隆坡', country: 'MY', longitude: 101.6869, latitude: 3.1390, timezone: 'Asia/Kuala_Lumpur', aliases: ['KL'] },
  { name: 'Bangkok', chineseName: '曼谷', country: 'TH', longitude: 100.5018, latitude: 13.7563, timezone: 'Asia/Bangkok', aliases: [] },
  { name: 'Mumbai', chineseName: '孟买', country: 'IN', longitude: 72.8777, latitude: 19.0760, timezone: 'Asia/Kolkata', aliases: ['Bombay'] },
  { name: 'New Delhi', chineseName: '新德里', country: 'IN', longitude: 77.2090, latitude: 28.6139, timezone: 'Asia/Kolkata', aliases: ['德里', 'Delhi'] },
  { name: 'Dubai', chineseName: '迪拜', country: 'AE', longitude: 55.2708, latitude: 25.2048, timezone: 'Asia/Dubai', aliases: ['杜拜'] },
  { name: 'Riyadh', chineseName: '利雅得', country: 'SA', longitude: 46.6753, latitude: 24.7136, timezone: 'Asia/Riyadh', aliases: [] },

  // 大洋洲主要城市
  { name: 'Sydney', chineseName: '悉尼', country: 'AU', longitude: 151.2093, latitude: -33.8688, timezone: 'Australia/Sydney', aliases: ['雪梨'] },
  { name: 'Melbourne', chineseName: '墨尔本', country: 'AU', longitude: 144.9631, latitude: -37.8136, timezone: 'Australia/Melbourne', aliases: [] },
  { name: 'Perth', chineseName: '珀斯', country: 'AU', longitude: 115.8605, latitude: -31.9505, timezone: 'Australia/Perth', aliases: ['西澳'] },
  { name: 'Auckland', chineseName: '奥克兰', country: 'NZ', longitude: 174.7633, latitude: -36.8485, timezone: 'Pacific/Auckland', aliases: [] },

  // 南美洲与非洲主要城市
  { name: 'São Paulo', chineseName: '圣保罗', country: 'BR', longitude: -46.6333, latitude: -23.5505, timezone: 'America/Sao_Paulo', aliases: ['Sao Paulo', '圣保罗市'] },
  { name: 'Buenos Aires', chineseName: '布宜诺斯艾利斯', country: 'AR', longitude: -58.3816, latitude: -34.6037, timezone: 'America/Argentina/Buenos_Aires', aliases: [] },
  { name: 'Johannesburg', chineseName: '约翰内斯堡', country: 'ZA', longitude: 28.0473, latitude: -26.2041, timezone: 'Africa/Johannesburg', aliases: ['约堡'] },
  { name: 'Cape Town', chineseName: '开普敦', country: 'ZA', longitude: 18.4241, latitude: -33.9249, timezone: 'Africa/Johannesburg', aliases: [] },
  { name: 'Cairo', chineseName: '开罗', country: 'EG', longitude: 31.2357, latitude: 30.0444, timezone: 'Africa/Cairo', aliases: [] }
];

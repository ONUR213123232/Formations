// ============================================================================
// FORMASYON TESPİT API - BACKEND
// Pine Script'ten JavaScript'e çevrilmiş
// ============================================================================

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // OPTIONS request için
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const { candles, settings } = JSON.parse(event.body);

        if (!candles || candles.length < 20) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'En az 20 mum verisi gerekli' })
            };
        }

        // Ayarlar
        const lookback = settings?.lookback || 10;
        const showTriangles = settings?.showTriangles !== false;
        const showWedges = settings?.showWedges !== false;
        const showDoublePatterns = settings?.showDoublePatterns !== false;
        const showHeadShoulders = settings?.showHeadShoulders !== false;
        const showChannels = settings?.showChannels !== false;

        // Formasyonları tespit et
        const formations = detectFormations(
            candles,
            lookback,
            showTriangles,
            showWedges,
            showDoublePatterns,
            showHeadShoulders,
            showChannels
        );

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ formations })
        };

    } catch (error) {
        console.error('Formation detection error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};

// ============================================================================
// YARDIMCI FONKSİYONLAR
// ============================================================================

function findPivots(candles, lookback) {
    const pivotHighs = [];
    const pivotLows = [];

    for (let i = lookback; i < candles.length - lookback; i++) {
        let isHigh = true;
        let isLow = true;

        // Pivot high kontrolü
        for (let j = i - lookback; j <= i + lookback; j++) {
            if (j !== i && candles[j].high >= candles[i].high) {
                isHigh = false;
                break;
            }
        }

        // Pivot low kontrolü
        for (let j = i - lookback; j <= i + lookback; j++) {
            if (j !== i && candles[j].low <= candles[i].low) {
                isLow = false;
                break;
            }
        }

        if (isHigh) {
            pivotHighs.push({
                index: i,
                price: candles[i].high,
                time: candles[i].time
            });
        }

        if (isLow) {
            pivotLows.push({
                index: i,
                price: candles[i].low,
                time: candles[i].time
            });
        }
    }

    return { pivotHighs, pivotLows };
}

// ============================================================================
// FORMASYON TESPİT FONKSİYONU
// ============================================================================

function detectFormations(candles, lookback, showTriangles, showWedges, showDoublePatterns, showHeadShoulders, showChannels) {
    const formations = [];
    const { pivotHighs, pivotLows } = findPivots(candles, lookback);

    // Son 10 pivot'u al
    const highs = pivotHighs.slice(-10);
    const lows = pivotLows.slice(-10);

    // ========================================================================
    // ÜÇGEN FORMASYONLARI
    // ========================================================================
    if (showTriangles && highs.length >= 3 && lows.length >= 3) {
        const h1 = highs[highs.length - 3];
        const h2 = highs[highs.length - 2];
        const h3 = highs[highs.length - 1];

        const l1 = lows[lows.length - 3];
        const l2 = lows[lows.length - 2];
        const l3 = lows[lows.length - 1];

        // Yükselen Üçgen (Ascending Triangle)
        if (Math.abs(h1.price - h2.price) / h1.price < 0.02 &&
            Math.abs(h2.price - h3.price) / h2.price < 0.02 &&
            l3.price > l2.price && l2.price > l1.price) {
            
            const resistanceLevel = (h1.price + h2.price + h3.price) / 3;
            const targetPrice = h3.price + (h3.price - l1.price) * 0.8;

            formations.push({
                type: 'ASCENDING_TRIANGLE',
                direction: 'bullish',
                lines: [
                    {
                        type: 'resistance',
                        x1: h1.time,
                        y1: resistanceLevel,
                        x2: h3.time + 25 * 60,
                        y2: resistanceLevel,
                        color: '#f6465d'
                    },
                    {
                        type: 'support',
                        x1: l1.time,
                        y1: l1.price,
                        x2: l3.time + 25 * 60,
                        y2: l3.price + ((l3.price - l1.price) / (l3.index - l1.index)) * 25,
                        color: '#0ecb81'
                    },
                    {
                        type: 'target',
                        x1: h3.time + 5 * 60,
                        y1: h3.price,
                        x2: h3.time + 30 * 60,
                        y2: targetPrice,
                        color: '#0ecb81',
                        style: 'dotted'
                    }
                ],
                label: {
                    text: 'ASCENDING TRIANGLE',
                    x: (h1.time + h3.time) / 2,
                    y: h2.price,
                    color: '#0ecb81'
                },
                targetLabel: {
                    text: `Target: ${targetPrice.toFixed(4)}`,
                    x: h3.time + 30 * 60,
                    y: targetPrice,
                    color: '#0ecb81'
                }
            });
        }

        // Alçalan Üçgen (Descending Triangle)
        else if (Math.abs(l1.price - l2.price) / l1.price < 0.02 &&
                 Math.abs(l2.price - l3.price) / l2.price < 0.02 &&
                 h3.price < h2.price && h2.price < h1.price) {
            
            const supportLevel = (l1.price + l2.price + l3.price) / 3;
            const targetPrice = l3.price - (h1.price - l3.price) * 0.8;

            formations.push({
                type: 'DESCENDING_TRIANGLE',
                direction: 'bearish',
                lines: [
                    {
                        type: 'support',
                        x1: l1.time,
                        y1: supportLevel,
                        x2: l3.time + 25 * 60,
                        y2: supportLevel,
                        color: '#0ecb81'
                    },
                    {
                        type: 'resistance',
                        x1: h1.time,
                        y1: h1.price,
                        x2: h3.time + 25 * 60,
                        y2: h3.price + ((h3.price - h1.price) / (h3.index - h1.index)) * 25,
                        color: '#f6465d'
                    },
                    {
                        type: 'target',
                        x1: l3.time + 5 * 60,
                        y1: l3.price,
                        x2: l3.time + 30 * 60,
                        y2: targetPrice,
                        color: '#f6465d',
                        style: 'dotted'
                    }
                ],
                label: {
                    text: 'DESCENDING TRIANGLE',
                    x: (l1.time + l3.time) / 2,
                    y: l2.price,
                    color: '#f6465d'
                },
                targetLabel: {
                    text: `Target: ${targetPrice.toFixed(4)}`,
                    x: l3.time + 30 * 60,
                    y: targetPrice,
                    color: '#f6465d'
                }
            });
        }

        // Simetrik Üçgen (Symmetrical Triangle)
        else if (h3.price < h2.price && h2.price < h1.price &&
                 l3.price > l2.price && l2.price > l1.price) {
            
            const slopeHigh = (h3.price - h1.price) / (h3.index - h1.index);
            const slopeLow = (l3.price - l1.price) / (l3.index - l1.index);

            if (Math.abs(slopeHigh + slopeLow) < Math.abs(slopeHigh) * 0.3) {
                const triangleHeight = h1.price - l1.price;
                const targetUp = h3.price + triangleHeight * 0.8;
                const targetDown = l3.price - triangleHeight * 0.8;

                formations.push({
                    type: 'SYMMETRICAL_TRIANGLE',
                    direction: 'neutral',
                    lines: [
                        {
                            type: 'resistance',
                            x1: h1.time,
                            y1: h1.price,
                            x2: h3.time + 25 * 60,
                            y2: h3.price + slopeHigh * 25,
                            color: '#f6465d'
                        },
                        {
                            type: 'support',
                            x1: l1.time,
                            y1: l1.price,
                            x2: l3.time + 25 * 60,
                            y2: l3.price + slopeLow * 25,
                            color: '#0ecb81'
                        },
                        {
                            type: 'target_up',
                            x1: Math.max(h3.time, l3.time) + 5 * 60,
                            y1: h3.price,
                            x2: Math.max(h3.time, l3.time) + 30 * 60,
                            y2: targetUp,
                            color: '#0ecb81',
                            style: 'dotted'
                        },
                        {
                            type: 'target_down',
                            x1: Math.max(h3.time, l3.time) + 5 * 60,
                            y1: l3.price,
                            x2: Math.max(h3.time, l3.time) + 30 * 60,
                            y2: targetDown,
                            color: '#f6465d',
                            style: 'dotted'
                        }
                    ],
                    label: {
                        text: 'SYMMETRICAL TRIANGLE',
                        x: Math.max(h3.time, l3.time),
                        y: (h3.price + l3.price) / 2,
                        color: '#2196F3'
                    },
                    targetLabels: [
                        {
                            text: `Target ↑: ${targetUp.toFixed(4)}`,
                            x: Math.max(h3.time, l3.time) + 30 * 60,
                            y: targetUp,
                            color: '#0ecb81'
                        },
                        {
                            text: `Target ↓: ${targetDown.toFixed(4)}`,
                            x: Math.max(h3.time, l3.time) + 30 * 60,
                            y: targetDown,
                            color: '#f6465d'
                        }
                    ]
                });
            }
        }
    }

    // ========================================================================
    // KAMA FORMASYONLARI
    // ========================================================================
    if (showWedges && highs.length >= 3 && lows.length >= 3) {
        const h1 = highs[highs.length - 3];
        const h2 = highs[highs.length - 2];
        const h3 = highs[highs.length - 1];

        const l1 = lows[lows.length - 3];
        const l2 = lows[lows.length - 2];
        const l3 = lows[lows.length - 1];

        // Yükselen Kama (Rising Wedge)
        if (h3.price > h2.price && h2.price > h1.price &&
            l3.price > l2.price && l2.price > l1.price) {
            
            const slopeHigh = (h3.price - h1.price) / (h3.index - h1.index);
            const slopeLow = (l3.price - l1.price) / (l3.index - l1.index);

            if (slopeLow > slopeHigh && slopeHigh > 0) {
                const wedgeHeight = h3.price - l1.price;
                const targetPrice = l3.price - wedgeHeight * 0.8;

                formations.push({
                    type: 'RISING_WEDGE',
                    direction: 'bearish',
                    lines: [
                        {
                            type: 'resistance',
                            x1: h1.time,
                            y1: h1.price,
                            x2: h3.time + 25 * 60,
                            y2: h3.price + slopeHigh * 25,
                            color: '#f6465d'
                        },
                        {
                            type: 'support',
                            x1: l1.time,
                            y1: l1.price,
                            x2: l3.time + 25 * 60,
                            y2: l3.price + slopeLow * 25,
                            color: '#f6465d'
                        },
                        {
                            type: 'target',
                            x1: l3.time + 5 * 60,
                            y1: l3.price,
                            x2: l3.time + 30 * 60,
                            y2: targetPrice,
                            color: '#f6465d',
                            style: 'dotted'
                        }
                    ],
                    label: {
                        text: 'RISING WEDGE',
                        x: (h1.time + h3.time) / 2,
                        y: h2.price,
                        color: '#f6465d'
                    },
                    targetLabel: {
                        text: `Target: ${targetPrice.toFixed(4)}`,
                        x: l3.time + 30 * 60,
                        y: targetPrice,
                        color: '#f6465d'
                    }
                });
            }
        }

        // Alçalan Kama (Falling Wedge)
        else if (h3.price < h2.price && h2.price < h1.price &&
                 l3.price < l2.price && l2.price < l1.price) {
            
            const slopeHigh = (h3.price - h1.price) / (h3.index - h1.index);
            const slopeLow = (l3.price - l1.price) / (l3.index - l1.index);

            if (slopeHigh < slopeLow && slopeLow < 0) {
                const wedgeHeight = h1.price - l3.price;
                const targetPrice = h3.price + wedgeHeight * 0.8;

                formations.push({
                    type: 'FALLING_WEDGE',
                    direction: 'bullish',
                    lines: [
                        {
                            type: 'resistance',
                            x1: h1.time,
                            y1: h1.price,
                            x2: h3.time + 25 * 60,
                            y2: h3.price + slopeHigh * 25,
                            color: '#0ecb81'
                        },
                        {
                            type: 'support',
                            x1: l1.time,
                            y1: l1.price,
                            x2: l3.time + 25 * 60,
                            y2: l3.price + slopeLow * 25,
                            color: '#0ecb81'
                        },
                        {
                            type: 'target',
                            x1: h3.time + 5 * 60,
                            y1: h3.price,
                            x2: h3.time + 30 * 60,
                            y2: targetPrice,
                            color: '#0ecb81',
                            style: 'dotted'
                        }
                    ],
                    label: {
                        text: 'FALLING WEDGE',
                        x: (l1.time + l3.time) / 2,
                        y: l2.price,
                        color: '#0ecb81'
                    },
                    targetLabel: {
                        text: `Target: ${targetPrice.toFixed(4)}`,
                        x: h3.time + 30 * 60,
                        y: targetPrice,
                        color: '#0ecb81'
                    }
                });
            }
        }
    }

    // ========================================================================
    // ÇİFT TEPE/DİP FORMASYONLARI
    // ========================================================================
    if (showDoublePatterns && highs.length >= 2) {
        const h1 = highs[highs.length - 2];
        const h2 = highs[highs.length - 1];

        // Çift Tepe (Double Top)
        if (Math.abs(h1.price - h2.price) / h1.price < 0.03 && h2.index - h1.index > 5) {
            const resistanceLevel = (h1.price + h2.price) / 2;
            const neckline = Math.min(h1.price, h2.price) * 0.985;
            const patternHeight = resistanceLevel - neckline;
            const targetPrice = neckline - patternHeight * 0.8;

            formations.push({
                type: 'DOUBLE_TOP',
                direction: 'bearish',
                lines: [
                    {
                        type: 'resistance',
                        x1: h1.time,
                        y1: resistanceLevel,
                        x2: h2.time + 25 * 60,
                        y2: resistanceLevel,
                        color: '#f6465d'
                    },
                    {
                        type: 'neckline',
                        x1: h1.time,
                        y1: neckline,
                        x2: h2.time + 25 * 60,
                        y2: neckline,
                        color: '#2196F3',
                        style: 'dashed'
                    },
                    {
                        type: 'target',
                        x1: h2.time + 5 * 60,
                        y1: neckline,
                        x2: h2.time + 30 * 60,
                        y2: targetPrice,
                        color: '#f6465d',
                        style: 'dotted'
                    }
                ],
                label: {
                    text: 'DOUBLE TOP',
                    x: (h1.time + h2.time) / 2,
                    y: resistanceLevel,
                    color: '#f6465d'
                },
                targetLabel: {
                    text: `Target: ${targetPrice.toFixed(4)}`,
                    x: h2.time + 30 * 60,
                    y: targetPrice,
                    color: '#f6465d'
                }
            });
        }
    }

    if (showDoublePatterns && lows.length >= 2) {
        const l1 = lows[lows.length - 2];
        const l2 = lows[lows.length - 1];

        // Çift Dip (Double Bottom)
        if (Math.abs(l1.price - l2.price) / l1.price < 0.03 && l2.index - l1.index > 5) {
            const supportLevel = (l1.price + l2.price) / 2;
            const neckline = Math.max(l1.price, l2.price) * 1.015;
            const patternHeight = neckline - supportLevel;
            const targetPrice = neckline + patternHeight * 0.8;

            formations.push({
                type: 'DOUBLE_BOTTOM',
                direction: 'bullish',
                lines: [
                    {
                        type: 'support',
                        x1: l1.time,
                        y1: supportLevel,
                        x2: l2.time + 25 * 60,
                        y2: supportLevel,
                        color: '#0ecb81'
                    },
                    {
                        type: 'neckline',
                        x1: l1.time,
                        y1: neckline,
                        x2: l2.time + 25 * 60,
                        y2: neckline,
                        color: '#2196F3',
                        style: 'dashed'
                    },
                    {
                        type: 'target',
                        x1: l2.time + 5 * 60,
                        y1: neckline,
                        x2: l2.time + 30 * 60,
                        y2: targetPrice,
                        color: '#0ecb81',
                        style: 'dotted'
                    }
                ],
                label: {
                    text: 'DOUBLE BOTTOM',
                    x: (l1.time + l2.time) / 2,
                    y: supportLevel,
                    color: '#0ecb81'
                },
                targetLabel: {
                    text: `Target: ${targetPrice.toFixed(4)}`,
                    x: l2.time + 30 * 60,
                    y: targetPrice,
                    color: '#0ecb81'
                }
            });
        }
    }

    // ========================================================================
    // BAŞ-OMUZ FORMASYONU
    // ========================================================================
    if (showHeadShoulders && highs.length >= 3) {
        const h1 = highs[highs.length - 3];  // Sol omuz
        const h2 = highs[highs.length - 2];  // Baş
        const h3 = highs[highs.length - 1];  // Sağ omuz

        // Baş-Omuz kontrolü
        if (h2.price > h1.price && h2.price > h3.price &&
            Math.abs(h1.price - h3.price) / h1.price < 0.05) {
            
            const neckline = ((Math.min(h1.price, h3.price) + Math.max(h1.price, h3.price)) / 2) * 0.99;
            const patternHeight = h2.price - neckline;
            const targetPrice = neckline - patternHeight * 0.8;

            formations.push({
                type: 'HEAD_AND_SHOULDERS',
                direction: 'bearish',
                lines: [
                    {
                        type: 'left_shoulder',
                        x1: h1.time,
                        y1: h1.price,
                        x2: h2.time,
                        y2: h2.price,
                        color: '#f6465d'
                    },
                    {
                        type: 'right_shoulder',
                        x1: h2.time,
                        y1: h2.price,
                        x2: h3.time,
                        y2: h3.price,
                        color: '#f6465d'
                    },
                    {
                        type: 'neckline',
                        x1: h1.time,
                        y1: neckline,
                        x2: h3.time + 25 * 60,
                        y2: neckline,
                        color: '#2196F3',
                        style: 'dashed'
                    },
                    {
                        type: 'target',
                        x1: h3.time + 5 * 60,
                        y1: neckline,
                        x2: h3.time + 30 * 60,
                        y2: targetPrice,
                        color: '#f6465d',
                        style: 'dotted'
                    }
                ],
                label: {
                    text: 'HEAD & SHOULDERS',
                    x: h2.time,
                    y: h2.price,
                    color: '#f6465d'
                },
                targetLabel: {
                    text: `Target: ${targetPrice.toFixed(4)}`,
                    x: h3.time + 30 * 60,
                    y: targetPrice,
                    color: '#f6465d'
                }
            });
        }
    }

    // ========================================================================
    // KANAL FORMASYONLARI
    // ========================================================================
    if (showChannels && highs.length >= 2 && lows.length >= 2) {
        const h1 = highs[highs.length - 2];
        const h2 = highs[highs.length - 1];
        const l1 = lows[lows.length - 2];
        const l2 = lows[lows.length - 1];

        const slopeHigh = (h2.price - h1.price) / (h2.index - h1.index);
        const slopeLow = (l2.price - l1.price) / (l2.index - l1.index);

        // Paralel kanal kontrolü
        if (Math.abs(slopeHigh - slopeLow) < Math.abs(slopeHigh) * 0.2) {
            const channelDirection = slopeHigh > 0 ? 'ASCENDING' : slopeHigh < 0 ? 'DESCENDING' : 'HORIZONTAL';

            formations.push({
                type: 'CHANNEL',
                direction: channelDirection.toLowerCase(),
                lines: [
                    {
                        type: 'upper',
                        x1: h1.time,
                        y1: h1.price,
                        x2: h2.time + 15 * 60,
                        y2: h2.price + slopeHigh * 15,
                        color: '#f6465d'
                    },
                    {
                        type: 'lower',
                        x1: l1.time,
                        y1: l1.price,
                        x2: l2.time + 15 * 60,
                        y2: l2.price + slopeLow * 15,
                        color: '#0ecb81'
                    }
                ],
                label: {
                    text: `${channelDirection} CHANNEL`,
                    x: Math.max(h2.time, l2.time),
                    y: (h2.price + l2.price) / 2,
                    color: '#2196F3'
                }
            });
        }
    }

    return formations;
}

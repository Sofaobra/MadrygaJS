// private method for left rotations < 32
function leftRotLessThan32(h, l, n) {
    var h_rot, l_rot;
    if (n == 0) {
        h_rot = h;
        l_rot = l;
    } else {
        h_rot = ((h << n) | (l >>> (32-n))) >>> 0;
        l_rot = ((l << n) | (h >>> (32-n))) >>> 0;
    }
    return new Long(h_rot, l_rot);
}

// private method of left rotations >= 32
function leftRotGreaterEq32(h, l, n) {
    n = n - 32;
    var h_rot, l_rot;
    if (n == 0) {
        h_rot = l;
        l_rot = h;
    } else {
        h_rot = ((l << n) | (h >>> (32-n))) >>> 0;
        l_rot = ((h << n) | (l >>> (32-n))) >>> 0;
    }
    return new Long(h_rot, l_rot);
}

// private method for right rotations < 32
function rightRotLessThan32(h, l, n) {
    var h_rot, l_rot;
    if (n == 0) {
        h_rot = h;
        l_rot = l;
    } else {
        h_rot = ((h >>> n) | (l << (32-n))) >>> 0;
        l_rot = ((l >>> n) | (h << (32-n))) >>> 0;
    }
    return new Long(h_rot, l_rot);
}

// private method for right rotations >= 32
function rightRotGreaterEq32(h, l, n) {
    n = n - 32;
    var h_rot, l_rot;
    if (n == 0) {
        h_rot = l;
        l_rot = h;
    } else {
        h_rot = ((l >>> n) | (h << (32-n))) >>> 0;
        l_rot = ((h >>> n) | (l << (32-n))) >>> 0;
    }
    return new Long(h_rot, l_rot);
}


/**
 * Long - 64-битный тип данных unsigned int
 */
function Long(h,l) {
    this.hi = h;
    this.lo = l;
}
    
/**
 * Выполняет циклический сдвиг влево по этому 64-разрядному длинному значению
 */
Long.prototype.circularLeftShift = function(n) {
    n = n % 64;
    var result;
    if (n < 32) {
        result = leftRotLessThan32(this.hi, this.lo, n);
    } else {
        result = leftRotGreaterEq32(this.hi, this.lo, n);
    }
    return result;
}

/**
 * Выполняет циклический сдвиг вправо по этому 64-разрядному длинному значению
 */
Long.prototype.circularRightShift = function(n) {
    n = n % 64;
    var result;
    if (n < 32) {
        result = rightRotLessThan32(this.hi, this.lo, n);
    } else {
        result = rightRotGreaterEq32(this.hi, this.lo, n);
    }
    return result;
}

/**
 * Выполняет побитовое И с данным длинным значением и полученным параметром
 */
Long.prototype.AND = function(other) {
    return new Long(this.hi & other.hi, this.lo & other.lo);
}

/**
 * Выполняет XOR с данным значением и полученным параметром
 */
Long.prototype.XOR = function(other) {
    return new Long(this.hi ^ other.hi, this.lo ^ other.lo);
}

/**
 * Выполняет побитовое ИЛИ с данным значением и полученным параметром
 */
Long.prototype.OR = function(other) {
    return new Long(this.hi | other.hi, this.lo | other.lo);
}

/**
 * Сдвигает данное значением на n бит направо 
 */
Long.prototype.rightShift = function(n) {
    var hi_shift, lo_shift;
    if (n == 0) {
        return new Long(this.hi, this.lo);
    } else if (n < 32) {
        hi_shift = this.hi >>> n;
        lo_shift = ((this.lo >>> n) | (this.hi << (32 - n))) >>> 0;
        return new Long(hi_shift, lo_shift);
    } else {
        n = n - 32;
        if (n == 0)
            return new Long(0, this.hi);
        else if (n >= 32)
            return new Long(0,0);
        hi_shift = 0;
        lo_shift = this.hi >>> n;
        return new Long(hi_shift, lo_shift);
    }
}

/**
 * Сдвигает данное значением на n бит налево 
 */
Long.prototype.leftShift = function(n) {
    var hi_shift, lo_shift;
    if (n == 0) {
        return new Long(this.hi, this.lo);
    } else if (n < 32) {
        hi_shift = ((this.hi << n) | (this.lo >>> (32 - n))) >>> 0;
        lo_shift = this.lo << n;
        return new Long(hi_shift, lo_shift);
    } else {
        n = n - 32;
        if (n == 0)
            return new Long(this.lo, 0);
        else if (n >= 32)
            return new Long(0,0);
        hi_shift = this.lo << n;
        lo_shift = 0;
        return new Long(hi_shift, lo_shift);
    }
}

madryga = {};
(function() {
    var BLOCK_SIZE = 64; // 64-битный блок
    var KEY_HASH = new Long(0x0f1e2d3c, 0x4b5a6978);
    var FRAME_MASK = new Long(0, 0xffff);
    var TEXT_MASK = new Long(0xffffffff, 0xffff0000);
    var SEVEN = new Long(0, 0x7);
    var XFF = new Long(0, 0xff);

    /**
     * Генерирует все (круговые?) ключи, необходимые для шифрования/дешифрования текста произвольной длинны
     * @param {Long} key Ключ для шифрования/дешифрования
     * @param {int} rounds Количество раундов для генерации подключей
     * @return {Array<Long>} Массив подключей
     */
    function getRoundKeys(key, rounds) {
        var roundKey = key;
        var round_keys = new Array(rounds);
        for (i = 0; i < rounds; i++) {
            roundKey = roundKey.circularRightShift(3).XOR(KEY_HASH);
            round_keys[i] = roundKey;
        }
        return round_keys;
    }

    /**
     * Выполняет n-битное циклическое вращение налево в двухбайтном кадре
     * @param {Long} frame Кадр поворота; Хоть и Long, но используются только два младших значащих байта 
     * @param {int} n Количество бит для поворота кадра
     * @return {Long} Кадр, повернутый на n бит влево. Будут установлены только два наименьших байта кадра
     */
    function rotateFrame(frame, n) {
        n = n % 16;
        if (n == 0) {
            return frame;
        }
        var lo, shifted_off;
        lo = frame.lo & 0xffff;
        lo = lo << n;
        shifted_off = lo >>> 16;
        lo = lo & 0xffff;
        return new Long(0, lo | shifted_off);
    }

    function doEncrypt(plaintext, keys) {
        var roundKey, textBlock, workFrame, rotationCount, ciphertext;
        ciphertext = new Array(plaintext.length);
        for (var k=0; k < plaintext.length; k++)
        {
            textBlock = plaintext[k];
            for (var i=0; i < 8; i++) {
                for (var j=0; j < 8; j++) {
                    // workFrame (Рабочий кадр) здесь это W1, W2 
                    workFrame = textBlock.circularLeftShift(8*j).AND(FRAME_MASK);
                    roundKey = keys[i*8 + j];
                    // textBlock >> (56 - 8*j) == W3 здесь
                    // extract rot. count from 3 least significant bits of W3
                    rotationCount = textBlock.rightShift(56 - 8*j).AND(SEVEN).lo;
                    // XORим W3 с младшим значащими байтом ключа (with least sig. byte of round key) 
                    // This sets W3 to its new value Устаналивает новое значение В3 
                    textBlock = textBlock.XOR((roundKey.AND(xFF).leftShift(56 - 8*j)));
                    workFrame = rotateFrame(workFrame, rotationCount);
                    // AND обнуляет байты W1W2 из text block
                    // OR заполняет обнуленные байты значениями W1W2 из рабочего кадра workframe
                    textBlock = (textBlock.AND(TEXT_MASK.circularRightShift(8*j)))
                        .OR(workFrame.circularLeftShift(64 - 8*j));
                }
            }
            ciphertext[k] = textBlock;
        }
        return ciphertext;
    }

    function encrypt(plaintext, key) {
        var keys = getRoundKeys(key, 64);
        return doEncrypt(plaintext, keys);
    }

    // Расшифровка - это обратная операция шифрования, при этом шаги выполняются в обратном порядке и порядок ключей инвертируется.
    function doDecrypt(ciphertext, keys) {
        var roundKey, textBlock, workFrame, rotationCount, plaintext;
        plaintext = new Array(ciphertext.length);
        for (var k=0; k < ciphertext.length; k++)
        {
            textBlock = ciphertext[k];
            for (var i=0; i < 8; i++) {
                for (var j=0; j < 8; j++) {
                    // workFrame is W1, W2 here
                    workFrame = textBlock.circularLeftShift(8*(7-j)).AND(FRAME_MASK);
                    roundKey = keys[i*8 + j];
                    // XOR W3 with least sig. byte of round key 
                    // This sets W3 to its new value
                    textBlock = textBlock.XOR((roundKey.AND(xFF).leftShift(56 - 8*(7-j))));
                    // textBlock >> (56 - 8*j) == W3 here
                    // extract rot. count from 3 least significant bits of W3
                    rotationCount = textBlock.rightShift(56 - 8*(7-j)).AND(SEVEN).lo;
                    workFrame = rotateFrame(workFrame, 16 - rotationCount);
                    // The AND zeroes out the W1W2 bytes of the text block
                    // The OR fills those zeroed-out bytes with the values 
                    //   of W1W2 from the work frame
                    textBlock = (textBlock.AND(TEXT_MASK.circularRightShift(8*(7-j))))
                        .OR(workFrame.circularLeftShift(64 - 8*(7-j)));
                }
            }
            plaintext[k] = textBlock;
        }
        return plaintext;
    }

    function decrypt(ciphertext, key) {
        var keys = getRoundKeys(key, 64);
        keys.reverse();
        return doDecrypt(ciphertext, keys);
    }

    this.encrypt = encrypt;
    this.decrypt = decrypt;
 }).apply(madryga);

/**
 * Добавляет отступы в конец строки, пока она не будет требуемой длины
 * Берет str: это строка to pad, len: требуемая длина строки
 * Возвращает строку, дополненную нулевыми символами до нужной длины
 */
function padString(str, len) {
    var strLen = str.length;
    var missing = strLen % len;
    if (missing != 0) {
        str += Array(len + 1 - missing).join(String.fromCharCode(0x00));
    }
    return str;
}

/**
 * Принимает входную строку и возвращает 64-битный массив, дополненный при необходимости.
 * Функция эффективно принимает ввод и разбивает его на массив из 64-битных блоков для шифрования и дешифрования
 */
function strToLongs(str) {
    str = padString(str, 8);
    var long_array = new Array();
    var msg_len = str.length;
    for (i=0; i < msg_len-7; i += 8) {
        hi = (str.charCodeAt(i) << 24) | (str.charCodeAt(i+1) << 16) |
             (str.charCodeAt(i+2) << 8) | str.charCodeAt(i+3);
        lo = (str.charCodeAt(i+4) << 24) | (str.charCodeAt(i+5) << 16) |
             (str.charCodeAt(i+6) << 8) | str.charCodeAt(i+7);
        long_array.push(new Long(hi, lo));
    }
    return long_array;
}

function longsToStr(longs) {
    var long_hi, long_lo, j;
    var strs = new Array(longs.length * 8);
    j = 0;
    for (i=0; i < longs.length; i++) {
        long_hi = longs[i].hi;
        long_lo = longs[i].lo;
        strs[j] = String.fromCharCode((long_hi >>> 24) & 0xff);
        strs[j+1] = String.fromCharCode((long_hi >>> 16) & 0xff);
        strs[j+2] = String.fromCharCode((long_hi >>> 8) & 0xff);
        strs[j+3] = String.fromCharCode(long_hi & 0xff);
        strs[j+4] = String.fromCharCode((long_lo >>> 24) & 0xff);
        strs[j+5] = String.fromCharCode((long_lo >>> 16) & 0xff);
        strs[j+6] = String.fromCharCode((long_lo >>> 8) & 0xff);
        strs[j+7] = String.fromCharCode(long_lo & 0xff);
        j += 8;
    }
    return strs.join('');
}

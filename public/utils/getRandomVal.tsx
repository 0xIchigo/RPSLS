const getRandomVal = () => {
    const newArray = new Uint8Array(32);
    crypto.getRandomValues(newArray);

    /*
        Kind of annoying but viem doesn't have a built-in function for converting to a BigInt
        Here we are using bitwise operations to construct a 'BigInt' (as the salt needs to be of type BigInt) from
        the raw binary data. First we shift the value left by 8 bits then we OR the current byte value
    */

    let value = BigInt(0);

    for (let i = 0; i < newArray.length; i++) {
        value <<= BigInt(8);
        value |= BigInt(newArray[i]);
    }

    return value;
}

export default getRandomVal;
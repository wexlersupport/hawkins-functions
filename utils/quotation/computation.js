export function getTotalCosts(data, item) {
  const _data = data?.filter((items) => items?.item === item);
  return Number(
    _data.reduce((acc, item) => Number(acc) + Number(item.cost), 0).toFixed(2)
  );
}

export function getTotalMaterialCosts(data) {
  const material_costs = getTotalCosts(data, "mat_cost");
  const mat_cost_pvs_input = data?.find(
    (items) => items?.item === "mat_cost_pvs_input"
  );
  const pvs = getPvs(material_costs, mat_cost_pvs_input.cost);
  const subtotal = getSubTotal(material_costs, pvs);
  const mat_cost_tax_input = data?.find(
    (items) => items?.item === "mat_cost_tax_input"
  );
  const tax = getMatTax(subtotal, mat_cost_tax_input.cost);

  return Number((subtotal + tax).toFixed(2));
}

export function getPvs(material_costs, mat_cost_pvs_input) {
  return Number(((material_costs * mat_cost_pvs_input) / 100).toFixed(2));
}

export function getSubTotal(material_costs, pvs) {
  return Number((material_costs + pvs).toFixed(2));
}

export function getMatTax(subtotal, mat_cost_tax_input) {
  return Number(((subtotal * mat_cost_tax_input) / 100).toFixed(2));
}

export function getLaborCosts(data) {
  const laborHours = data.find((items) => items?.name === "labor_hours");
  const laborRate = data.find((items) => items?.name === "labor_rate");
  const overtimeHours = data.find((items) => items?.name === "ot_hours");
  const overtimeRate = data.find((items) => items?.name === "ot_rate");

  const labor = Number((laborHours?.cost * laborRate?.cost).toFixed(2));
  const ot = Number((overtimeHours?.cost * overtimeRate?.cost).toFixed(2));

  return Number((labor + ot).toFixed(2));
}

export function getBiddingPrice(data) {
  const mat_gp_data = data.find((items) => items?.name === "mat_gp");
  const mat_gp = getBiddingPriceMat(data, mat_gp_data?.cost);
  // console.log('mat_gp ', mat_gp)

  const laborHours = data.find((items) => items?.name === "labor_hours");
  const labor_gp_data = data.find((items) => items?.name === "labor_gp");
  const labor_gp = Number((laborHours?.cost * labor_gp_data?.cost).toFixed(2));
  // console.log('labor_gp ', labor_gp)

  const overtimeHours = data.find((items) => items?.name === "ot_hours");
  const labor_ot_gp_data = data.find((items) => items?.name === "labor_ot_gp");
  const labor_ot_gp = Number(
    (overtimeHours?.cost * labor_ot_gp_data?.cost).toFixed(2)
  );
  // console.log('labor_ot_gp ', labor_ot_gp)

  const misc_gp_data = data.find((items) => items?.name === "misc_gp");
  const misc_gp = getBiddingPriceMisc(data, misc_gp_data?.cost);
  // console.log('misc_gp ', misc_gp)

  const subcon_gp_data = data.find((items) => items?.name === "subcon_gp");
  const subcon_gp = getBiddingPriceSubcon(data, subcon_gp_data?.cost);
  // console.log('subcon_gp ', subcon_gp)

  return Number(
    (mat_gp + labor_gp + labor_ot_gp + misc_gp + subcon_gp).toFixed(2)
  );
}

export function getBiddingPriceMat(data, gp) {
  const cost = getTotalMaterialCosts(data);

  return Number((cost / (1 - gp / 100)).toFixed(2));
}

export function getBiddingPriceMisc(data, gp) {
  const cost = getTotalCosts(data, "misc_cost");

  return Number((cost / (1 - gp / 100)).toFixed(2));
}

export function getBiddingPriceSubcon(data, gp) {
  const cost = getTotalCosts(data, "subcon_cost");

  return Number((cost / (1 - gp / 100)).toFixed(2));
}

export default function getFinalPrice(data) {
  const bidding_price = getBiddingPrice(data);
  const extra_deduct = data?.find((item) => item.name === "extra_deduct") || 0;

  return Number((bidding_price + Number(extra_deduct?.cost)).toFixed(2));
}

export function onUpdateItems(data, item) {
  const items = [];
  if (data?.length > 0) {
    const costs = data.filter((d) => d.item === item);
    if (costs.length > 0) {
      costs.forEach((item) => {
        items.push({
          id: Number(item?.id) ?? 0,
          work_order_id: Number(item?.work_order_id) ?? 0,
          name: item.name,
          cost: Number(item.cost),
        });
      });
    }
  }

  return items;
}

export function getItem(data, item, properties = "item") {
  const result = data?.find((items) => items[properties] === item);
  return Number(result?.cost) || 0;
}

export function getDynamicItem(data, item, properties, output) {
  const result = data?.find((items) => items[properties] === item);
  return result[output];
}

export function convertNumberToWords(number, options = {}) {
  // Default options for currency (can be overridden)
  const defaultOptions = {
    currencyName: "dollar", // Singular name for the main currency unit
    currencyNamePlural: "dollars", // Plural name for the main currency unit
    subCurrencyName: "cent", // Singular name for the sub-currency unit
    subCurrencyNamePlural: "cents", // Plural name for the sub-currency unit
    includeCents: true, // Default to true when currency is involved
    leadingAnd: false, // Whether to add "and" before cents if there's an integer part
  };
  const finalOptions = { ...defaultOptions, ...options };

  if (typeof number !== "number") {
    return "Please provide a valid number.";
  }

  const units = [
    "",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
  ];
  const teens = [
    "",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const tens = [
    "",
    "ten",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
  ];
  const thousands = ["", "thousand", "million", "billion", "trillion"];

  // Helper function to convert numbers less than one thousand to words
  function convertLessThanOneThousand(num) {
    let str = "";
    if (Math.floor(num / 100) > 0) {
      str += units[Math.floor(num / 100)] + " hundred ";
      num %= 100;
    }
    if (num > 0) {
      if (str !== "" && num < 100) {
        // Add "and" only if there are hundreds and remaining part is less than 100
        str += "and ";
      }
      if (num < 10) {
        str += units[num];
      } else if (num >= 11 && num <= 19) {
        str += teens[num - 10];
      } else {
        str += tens[Math.floor(num / 10)];
        if (num % 10 > 0) {
          str += "-" + units[num % 10];
        }
      }
    }
    return str.trim();
  }

  // Helper function to convert a string to proper case, excluding 'and'
  function toProperCase(str) {
    return str
      .split(" ")
      .map((word) => {
        if (word.toLowerCase() === "and" || word.toLowerCase() === "point") {
          // Keep 'and' and 'point' lowercase
          return word.toLowerCase();
        }
        if (word.includes("-")) {
          // Handle hyphenated words like "forty-two"
          return word
            .split("-")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join("-");
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ");
  }

  let isNegative = number < 0;
  let absoluteNumber = Math.abs(number);
  let integerPart = Math.floor(absoluteNumber);
  let decimalPart = Math.round((absoluteNumber - integerPart) * 100); // Get two decimal places

  let words = "";

  // Handle zero
  if (number === 0) {
    return toProperCase("zero " + (finalOptions.currencyNamePlural || "")); // Return "Zero Dollars" etc.
  }

  // Handle negative numbers
  if (isNegative) {
    words += "minus ";
  }

  // Convert integer part
  if (integerPart === 0) {
    // If integer part is zero, no need to add 'zero dollars' here if there are cents
  } else {
    let tempIntegerWords = "";
    let i = 0;
    let tempNumber = integerPart;

    while (tempNumber > 0) {
      if (tempNumber % 1000 !== 0) {
        let chunk = convertLessThanOneThousand(tempNumber % 1000);
        tempIntegerWords = chunk + " " + thousands[i] + " " + tempIntegerWords;
      }
      tempNumber = Math.floor(tempNumber / 1000);
      i++;
    }
    words += tempIntegerWords.trim();

    // Add currency name for the integer part
    if (finalOptions.currencyName && integerPart >= 0) {
      // Only add if currency name is provided in options
      if (integerPart === 1) {
        words += " " + finalOptions.currencyName;
      } else {
        words += " " + finalOptions.currencyNamePlural;
      }
    }
  }

  // Handle decimal part (cents/centavos)
  if (decimalPart > 0) {
    // Add "and" before cents only if there's an integer part AND options.leadingAnd is true
    if (integerPart > 0 && finalOptions.leadingAnd) {
      words += " and ";
    } else if (integerPart === 0 && words === "") {
      // For numbers like 0.75 where the integer part wasn't spoken
      // If words is empty it means integer part was 0, so we just go straight to cents
    } else if (integerPart > 0) {
      // If integerPart > 0 but leadingAnd is false, just add a space
      words += " ";
    } else if (integerPart === 0 && words !== "") {
      // if words is not empty, means "zero" was added to words, so add an 'and'
      words += " and ";
    }

    let subCurrencyWords = convertLessThanOneThousand(decimalPart);
    words += subCurrencyWords;

    // Add sub-currency name
    if (finalOptions.subCurrencyName) {
      // Only add if sub-currency name is provided
      if (decimalPart === 1) {
        words += " " + finalOptions.subCurrencyName;
      } else {
        words += " " + finalOptions.subCurrencyNamePlural;
      }
    }
  } else if (integerPart > 0 && decimalPart === 0 && finalOptions.currencyName) {
    // If there's an integer part but no decimal, and currency is involved, ensure currency pluralization is right.
    // This case is largely handled by the integer part, but ensures no extra "and zero cents"
  } else if (number !== 0 && words === "") {
    // Handles cases like 0.00
    words = "zero"; // If it's effectively zero and no currency was specified in the initial zero check
  }

  // Apply proper case to the entire string
  return toProperCase(words.trim());
}
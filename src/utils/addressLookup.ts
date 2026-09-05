export type AddressMatch = { pin: string; city: string; state: string };

const addresses: AddressMatch[] = [
  { pin: "110001", city: "Delhi", state: "Delhi" },
  { pin: "122001", city: "Gurugram", state: "Haryana" },
  { pin: "201301", city: "Noida", state: "Uttar Pradesh" },
  { pin: "302001", city: "Jaipur", state: "Rajasthan" },
  { pin: "380001", city: "Ahmedabad", state: "Gujarat" },
  { pin: "390001", city: "Vadodara", state: "Gujarat" },
  { pin: "395001", city: "Surat", state: "Gujarat" },
  { pin: "400001", city: "Mumbai", state: "Maharashtra" },
  { pin: "411001", city: "Pune", state: "Maharashtra" },
  { pin: "440001", city: "Nagpur", state: "Maharashtra" },
  { pin: "452001", city: "Indore", state: "Madhya Pradesh" },
  { pin: "462001", city: "Bhopal", state: "Madhya Pradesh" },
  { pin: "500001", city: "Hyderabad", state: "Telangana" },
  { pin: "530001", city: "Visakhapatnam", state: "Andhra Pradesh" },
  { pin: "560001", city: "Bengaluru", state: "Karnataka" },
  { pin: "570001", city: "Mysuru", state: "Karnataka" },
  { pin: "600001", city: "Chennai", state: "Tamil Nadu" },
  { pin: "625001", city: "Madurai", state: "Tamil Nadu" },
  { pin: "641001", city: "Coimbatore", state: "Tamil Nadu" },
  { pin: "682001", city: "Kochi", state: "Kerala" },
  { pin: "700001", city: "Kolkata", state: "West Bengal" },
  { pin: "751001", city: "Bhubaneswar", state: "Odisha" },
  { pin: "800001", city: "Patna", state: "Bihar" },
  { pin: "834001", city: "Ranchi", state: "Jharkhand" },
];

export const lookupAddressByPin = (pin: string) =>
  addresses.find(item => item.pin === pin) ?? null;

export const resolveAddressByPin = async (pin: string): Promise<AddressMatch | null> => {
  if (!/^[1-9]\d{5}$/.test(pin)) return null;
  const local = lookupAddressByPin(pin);
  if (local) return local;
  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    if (!response.ok) return null;
    const payload = await response.json();
    const result = payload?.[0];
    const postOffice = result?.PostOffice?.[0];
    if (result?.Status !== "Success" || !postOffice) return null;
    return {
      pin,
      city: postOffice.Block || postOffice.District || postOffice.Name,
      state: postOffice.State,
    };
  } catch {
    return null;
  }
};

export const suggestAddresses = (query: string, field: "city" | "state") => {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < 3) return [];
  const seen = new Set<string>();
  return addresses.filter(item => {
    const value = item[field].toLowerCase();
    if (!value.startsWith(normalized) || seen.has(value)) return false;
    seen.add(value);
    return true;
  }).slice(0, 5);
};

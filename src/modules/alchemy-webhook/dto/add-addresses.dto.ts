import { IsArray, ArrayNotEmpty, IsEthereumAddress } from "class-validator";

export class AddAddressesDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsEthereumAddress({ each: true })
    addresses: string[];
}

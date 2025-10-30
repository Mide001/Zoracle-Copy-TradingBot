import { IsArray, ArrayNotEmpty, IsEthereumAddress } from "class-validator";

export class RemoveAddressesDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsEthereumAddress({ each: true })
    addresses: string[];
}

